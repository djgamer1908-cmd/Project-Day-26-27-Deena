import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, MapPin, Loader2, Sparkles, AlertTriangle, CheckCircle2, X, Upload, RefreshCw } from 'lucide-react';
import { supabase, STORAGE_BUCKET, EDGE_FUNCTION_URL } from '@/lib/supabase';
import type { AnalysisResult, CivicIssue, IssueCategory } from '@/lib/types';
import { CATEGORY_META } from '@/lib/types';
import { useLanguage } from '@/lib/LanguageContext';

interface ReportFormProps {
  onSubmitted: (issue: CivicIssue) => void;
}

export default function ReportForm({ onSubmitted }: ReportFormProps) {
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      // Wait for video element to render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setError('Could not access camera. You can upload a photo instead.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    setShowConfirm(true);
  };

  const confirmPhoto = () => {
    if (!capturedPhoto) return;
    fetch(capturedPhoto)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhoto(file);
        setPhotoPreview(capturedPhoto);
        setAnalysis(null);
      });
    setShowConfirm(false);
    setCapturedPhoto(null);
    stopCamera();
  };

  const retakePhoto = () => {
    setShowConfirm(false);
    setCapturedPhoto(null);
    // Camera is still active, just go back to live feed
  };

  const handleFileSelect = (file: File) => {
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAnalysis(null);
  };

  const handleGetLocation = useCallback(() => {
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setError('Could not get your location. Please enter it manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const runAnalysis = async () => {
    if (!description.trim()) {
      setError('Please describe the issue first.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      };
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ description, latitude: lat, longitude: lng }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data: AnalysisResult = await res.json();
      setAnalysis(data);
    } catch {
      setError('Could not analyze the issue. You can still submit it.');
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photo) return null;
    const ext = photo.name.split('.').pop() || 'jpg';
    const filename = `civic-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(filename, photo, { contentType: photo.type });
    if (upErr) throw new Error('Photo upload failed');
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  };

  const computePriority = (severity: number, category: IssueCategory): number => {
    const catWeights: Record<IssueCategory, number> = { road: 1.2, water: 1.15, drain: 1.0, garbage: 0.9, streetlight: 0.8, other: 0.7 };
    return Math.round(severity * catWeights[category] * 20 * 100) / 100;
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please describe the issue.');
      return;
    }
    if (!reporterName.trim() || !reporterContact.trim()) {
      setError('Please enter your name and contact details.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const photoUrl = await uploadPhoto();
      const cat = analysis?.category || 'other';
      const sev = analysis?.severity || 3;
      const priority = computePriority(sev, cat);

      const insertData = {
        description: description.trim(),
        photo_url: photoUrl,
        category: cat,
        severity: sev,
        priority_score: priority,
        latitude: lat,
        longitude: lng,
        address: address.trim() || null,
        status: analysis ? 'classified' : 'submitted',
        duplicate_of: analysis?.duplicate_of || null,
        reporter_name: reporterName.trim() || null,
        reporter_contact: reporterContact.trim() || null,
        ai_summary: analysis?.summary || null,
        title: analysis?.title || null,
      };

      const { data, error: insErr } = await supabase.from('civic_issues').insert(insertData).select().single();
      if (insErr) throw new Error('Failed to submit report');
      onSubmitted(data as CivicIssue);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setPhoto(null);
    setPhotoPreview(null);
    setLat(null);
    setLng(null);
    setAddress('');
    setReporterName('');
    setReporterContact('');
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
        <h2 className="text-xl font-bold text-white">{t('reportIssue')}</h2>
        <p className="text-slate-300 text-sm mt-1">{t('description')}</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Photo — camera or upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t('photo')}</label>

          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden group">
              <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
              <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition">
                <X size={16} />
              </button>
            </div>
          ) : cameraActive ? (
            <div className="relative rounded-xl overflow-hidden bg-black">
              {!showConfirm ? (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
                    <button
                      onClick={capturePhoto}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-800 text-sm font-semibold hover:bg-slate-100 transition shadow-lg"
                    >
                      <Camera size={18} /> {t('capturePhoto')}
                    </button>
                    <button onClick={stopCamera} className="px-3 py-2.5 rounded-xl bg-black/60 text-white text-sm font-medium hover:bg-black/80 transition">
                      <X size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <img src={capturedPhoto!} alt="Captured" className="w-full h-64 object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
                    <p className="text-white text-sm font-semibold">{t('isPhotoOk')}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={confirmPhoto}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
                      >
                        <CheckCircle2 size={18} /> {t('yes')}
                      </button>
                      <button
                        onClick={retakePhoto}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-800 text-sm font-semibold hover:bg-slate-100 transition"
                      >
                        <RefreshCw size={18} /> {t('no')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={startCamera}
                className="flex-1 flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition"
              >
                <Camera size={28} />
                <span className="text-sm font-medium">{t('camera')}</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition"
              >
                <Upload size={28} />
                <span className="text-sm font-medium">{t('photo')}</span>
              </button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t('description')} *</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setAnalysis(null); }}
            rows={4}
            placeholder="e.g. Large pothole near the school entrance on Main Street, causing traffic to swerve into oncoming lane."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t('location')}</label>
          <div className="flex gap-2">
            <button
              onClick={handleGetLocation}
              disabled={locating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50"
            >
              {locating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
              {lat !== null ? `${lat.toFixed(4)}, ${lng!.toFixed(4)}` : t('useMyLocation')}
            </button>
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Or enter an address / landmark"
            className="w-full mt-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none"
          />
        </div>

        {/* Reporter info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('yourName')} *</label>
            <input type="text" value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="Jane Doe" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('contact')} *</label>
            <input type="text" value={reporterContact} onChange={(e) => setReporterContact(e.target.value)} placeholder="Phone or email" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none" />
          </div>
        </div>

        {/* AI Analysis */}
        {analysis && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
              <Sparkles size={16} /> {t('aiAnalysis')}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{t('category')}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_META[analysis.category].bg} ${CATEGORY_META[analysis.category].text}`}>
                  {CATEGORY_META[analysis.category].label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{t('severity')}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className={`w-4 h-4 rounded-sm ${n <= analysis.severity ? 'bg-rose-500' : 'bg-slate-200'}`} />
                  ))}
                </div>
                <span className="text-xs font-semibold text-rose-600">Level {analysis.severity}</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 italic">"{analysis.summary}"</p>
            {analysis.duplicate_of && (
              <div className="flex items-center gap-2 text-amber-700 text-sm bg-amber-50 rounded-lg px-3 py-2">
                <AlertTriangle size={16} /> {t('duplicateDetected')} ({Math.round(analysis.duplicate_similarity * 100)}% match)
              </div>
            )}
            {!analysis.duplicate_of && (
              <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle2 size={16} /> {t('noDuplicates')}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 rounded-lg px-3 py-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={runAnalysis}
            disabled={analyzing || !description.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {analyzing ? 'Analyzing...' : t('analyzeWithAI')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {submitting ? 'Submitting...' : t('submitReport')}
          </button>
        </div>
      </div>
    </div>
  );
}

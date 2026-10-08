"""
Two-sensor leak localisation simulation (NO physical testing).
Sensor noise comes from the datasheets:
  ADXL345 : 290 ug/sqrt(Hz) (X/Y), fs = 3200 Hz,  BW = ODR/2 = 1600 Hz
  IIS3DWB : 75  ug/sqrt(Hz) (X/Y), fs = 26667 Hz, BW = 6.3 kHz
Leak signal = band-limited Gaussian noise (a MODEL, amplitude unknown, swept).
Background pipe/pump noise, attenuation, dispersion and reflections are NOT modelled,
so results are best-case numbers for sensor noise + timing only.
"""
import numpy as np
rng = np.random.default_rng(7)
FH, L, T = 96000.0, 3.0, 1.0
SENS = {"ADXL345": dict(fs=3200.0, bw=1500.0, rho=290e-6),
        "IIS3DWB": dict(fs=26666.7, bw=6000.0, rho=75e-6)}

def bp(x, fs, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1/fs)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))

def source(lo, hi, rms):
    n = int(1.3*FH); s = bp(rng.standard_normal(n), FH, lo, hi)
    return -0.1 + np.arange(n)/FH, s*rms/s.std()

def sample(t, s, fs, delay, N, eps=0.0):
    return np.interp(np.arange(N)/(fs*(1+eps)) - delay, t, s)

def estimate(a, b, fs, a_est):
    nfft = 2*len(a)
    cc = np.fft.irfft(np.conj(np.fft.rfft(a, nfft))*np.fft.rfft(b, nfft), nfft)
    m = int(np.ceil(L/a_est*fs*1.2)); lags = np.arange(-m, m+1); v = cc[lags]
    k = int(np.argmax(v)); d = 0.0
    if 0 < k < len(v)-1:
        den = v[k-1]-2*v[k]+v[k+1]
        d = 0.5*(v[k-1]-v[k+1])/den if den != 0 else 0.0
    return (L - a_est*(lags[k]+d)/fs)/2

def trial(name, lo, hi, A, a_true=400., a_est=400., eps=0.0, Tw=T):
    p = SENS[name]; fs = p["fs"]; hiS = min(hi, p["bw"]); N = int(fs*Tw)
    t, s = source(lo, hi, A); x = rng.uniform(0.5, L-0.5)
    a = bp(sample(t, s, fs, x/a_true, N), fs, lo, hiS)
    b = bp(sample(t, s, fs, (L-x)/a_true, N, eps), fs, lo, hiS)
    sig = a.std(); nr = p["rho"]*np.sqrt(hiS-lo)
    def noise():
        w = bp(rng.standard_normal(N), fs, lo, hiS); return w*nr/w.std()
    a += noise(); b += noise()
    return abs(estimate(a, b, fs, a_est)-x)*100, 20*np.log10(sig/nr)

def run(name, lo, hi, A, n=80, **kw):
    r = np.array([trial(name, lo, hi, A, **kw) for _ in range(n)])
    return np.median(r[:,0]), np.percentile(r[:,0], 90), r[:,1].mean()

out = []
out.append("TABLE A: error (cm) vs leak vibration level, L=3 m, a=400 m/s exact, T=1 s")
out.append("band_Hz   sensor    level_mg  SNR_dB   median_cm   P90_cm")
for lo, hi in [(80, 600), (80, 2000)]:
    for name in SENS:
        for mg in [0.5, 1, 2, 5, 10, 30]:
            med, p90, snr = run(name, lo, hi, mg/1000)
            out.append(f"{lo}-{hi:<5} {name:8s} {mg:7.1f}  {snr:7.1f}  {med:9.1f}  {p90:8.1f}")
out.append("")
out.append("TABLE B: error sources at 10 mg leak level, band 80-600 Hz")
out.append("sensor    case                                  median_cm   P90_cm")
cases = [("ideal", {}),
         ("wave speed +10% wrong", dict(a_est=440.)),
         ("wave speed -10% wrong", dict(a_est=360.)),
         ("ODR mismatch 0.075% (residual after FINE trim)", dict(eps=0.00075)),
         ("ODR mismatch 0.15%", dict(eps=0.0015)),
         ("ODR mismatch 1% (uncorrected, typ spec)", dict(eps=0.01)),
         ("ODR mismatch 1%, window 0.25 s", dict(eps=0.01, Tw=0.25))]
for name in SENS:
    for label, kw in cases:
        med, p90, _ = run(name, 80, 600, 0.010, **kw)
        out.append(f"{name:8s}  {label:44s} {med:8.1f}  {p90:8.1f}")
txt = "\n".join(out); print(txt)
open("/mnt/user-data/outputs/leak_sim_results.txt", "w").write(txt)

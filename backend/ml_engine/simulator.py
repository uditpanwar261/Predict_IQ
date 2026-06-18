"""Virtual IoT Sensor Data Simulator with realistic degradation patterns."""
import numpy as np
import random
from datetime import datetime

MACHINE_BASELINES = {
    'motor':      {'temp': 65, 'vib': 2.5, 'pres': 6.0,  'cur': 15.0, 'rpm': 1450, 'oil': 85, 'noise': 72},
    'pump':       {'temp': 55, 'vib': 1.8, 'pres': 12.0, 'cur': 8.0,  'rpm': 1200, 'oil': 80, 'noise': 68},
    'compressor': {'temp': 80, 'vib': 3.2, 'pres': 18.0, 'cur': 22.0, 'rpm': 960,  'oil': 75, 'noise': 82},
    'conveyor':   {'temp': 45, 'vib': 1.5, 'pres': 4.0,  'cur': 12.0, 'rpm': 600,  'oil': 90, 'noise': 65},
    'turbine':    {'temp': 120,'vib': 4.0, 'pres': 25.0, 'cur': 35.0, 'rpm': 3000, 'oil': 70, 'noise': 88},
    'generator':  {'temp': 75, 'vib': 2.0, 'pres': 5.0,  'cur': 45.0, 'rpm': 1500, 'oil': 82, 'noise': 75},
    'hvac':       {'temp': 35, 'vib': 1.0, 'pres': 3.5,  'cur': 6.0,  'rpm': 800,  'oil': 95, 'noise': 58},
    'robot':      {'temp': 55, 'vib': 2.8, 'pres': 8.0,  'cur': 18.0, 'rpm': 2000, 'oil': 88, 'noise': 70},
}

def get_degradation_factor(health_score):
    """Higher degradation as health decreases."""
    return max(0, (100 - health_score) / 100) * 2.5

def generate_reading(machine_type, health_score=100.0):
    base = MACHINE_BASELINES.get(machine_type, MACHINE_BASELINES['motor'])
    deg = get_degradation_factor(health_score)
    noise = lambda s: np.random.normal(0, s)

    temp = base['temp'] + deg * 18 + noise(1.5) + abs(noise(0.5 * deg))
    vib  = base['vib']  + deg * 2.5 + abs(noise(0.3 + 0.2 * deg))
    pres = base['pres'] + noise(0.3) - deg * 0.5 + noise(0.1 * deg)
    cur  = base['cur']  + deg * 3.0 + noise(0.8)
    rpm  = base['rpm']  - deg * 80 + noise(15)
    oil  = max(10, base['oil'] - deg * 15 - abs(noise(2)))
    noise_db = base['noise'] + deg * 8 + noise(1.0)

    # Occasional spike events
    if random.random() < 0.05 * (1 + deg):
        temp += random.uniform(5, 20)
        vib  += random.uniform(1, 5)

    return {
        'temperature': round(max(20, temp), 2),
        'vibration':   round(max(0.1, vib), 3),
        'pressure':    round(max(0.5, pres), 2),
        'current':     round(max(0.5, cur), 2),
        'rpm':         round(max(100, rpm), 1),
        'oil_level':   round(min(100, max(5, oil)), 1),
        'noise_level': round(max(40, noise_db), 1),
    }

def compute_health_score(readings_list):
    """Compute health score 0-100 from recent readings."""
    if not readings_list:
        return 100.0
    scores = []
    for r in readings_list[-10:]:
        s = 100.0
        # Temperature penalty
        if r['temperature'] > 100: s -= 25
        elif r['temperature'] > 80: s -= 12
        # Vibration penalty
        if r['vibration'] > 6: s -= 25
        elif r['vibration'] > 4: s -= 12
        # Pressure anomaly
        if r['pressure'] < 1 or r['pressure'] > 30: s -= 15
        # Oil level
        if r['oil_level'] < 20: s -= 30
        elif r['oil_level'] < 40: s -= 15
        # RPM drop
        if r['rpm'] < 200: s -= 20
        scores.append(max(0, s))
    return round(sum(scores) / len(scores), 1)

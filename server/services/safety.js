export function computeSafetyStatus({ beach, marine, alerts = [] }) {
  const active = alerts.filter((a) => a.active !== false);
  let severity = 0;
  let reasons = [];

  const wave = Number(marine?.waveHeight ?? NaN);
  const current = Number(marine?.currentVelocity ?? NaN);

  if (Number.isFinite(wave)) {
    if (wave >= 2.0) { severity = Math.max(severity, 2); reasons.push('High modeled wave height'); }
    else if (wave >= 1.2) { severity = Math.max(severity, 1); reasons.push('Moderate modeled wave height'); }
  }

  if (Number.isFinite(current)) {
    if (current >= 1.2) { severity = Math.max(severity, 2); reasons.push('Stronger modeled surface current'); }
    else if (current >= 0.7) { severity = Math.max(severity, 1); reasons.push('Moderate modeled surface current'); }
  }

  const alertWeight = active.reduce((m, a) => Math.max(m, ({ info: 0, caution: 1, high: 2, emergency: 2 }[a.severity] ?? 0)), 0);
  severity = Math.max(severity, alertWeight);

  if (active.length > 0) reasons.push(`${active.length} active portal alert${active.length > 1 ? 's' : ''}`);

  const status = severity >= 2
    ? { key: 'red', label: 'Not recommended for water entry' }
    : severity === 1
      ? { key: 'yellow', label: 'Recommended with caution' }
      : { key: 'green', label: 'No Active Advisory' };

  return {
    ...status,
    reason: reasons.length ? reasons.join(' • ') : 'No application-level advisory is recorded.',
    generatedAt: new Date().toISOString(),
    methodology: 'Demo rule engine using current marine data plus portal alerts. Official authority decisions always take precedence.'
  };
}

export function createLiveAlerts({ weather, marine, beachId }) {
  const alerts = [];
  const issuedAt = marine?.time || weather?.time || new Date().toISOString();
  const windSpeed = Number(weather?.windSpeed);
  const waveHeight = Number(marine?.waveHeight);
  const currentVelocity = Number(marine?.currentVelocity);

  if (Number.isFinite(windSpeed) && windSpeed >= 35) {
    const severity = windSpeed >= 55 ? 'high' : 'caution';
    alerts.push({
      _id: `live-wind-${beachId}`,
      beachId,
      title: severity === 'high' ? 'High wind advisory' : 'Strong wind advisory',
      severity,
      description: `Modeled wind is ${windSpeed} km/h. Follow local beach and lifeguard instructions.`,
      source: 'Open-Meteo live model',
      issuedAt,
      active: true
    });
  }

  if (Number.isFinite(waveHeight) && waveHeight >= 1.2) {
    const severity = waveHeight >= 2 ? 'high' : 'caution';
    alerts.push({
      _id: `live-wave-${beachId}`,
      beachId,
      title: severity === 'high' ? 'High wave advisory' : 'Elevated wave advisory',
      severity,
      description: `Modeled wave height is ${waveHeight.toFixed(2)} m. Check local guidance before entering the water.`,
      source: 'Open-Meteo Marine live model',
      issuedAt,
      active: true
    });
  }

  if (Number.isFinite(currentVelocity) && currentVelocity >= 0.7) {
    const severity = currentVelocity >= 1.2 ? 'high' : 'caution';
    alerts.push({
      _id: `live-current-${beachId}`,
      beachId,
      title: severity === 'high' ? 'Strong current advisory' : 'Elevated current advisory',
      severity,
      description: `Modeled surface current is ${currentVelocity.toFixed(2)} m/s. Follow lifeguard instructions.`,
      source: 'Open-Meteo Marine live model',
      issuedAt,
      active: true
    });
  }

  return alerts;
}

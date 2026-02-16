import React from 'react'

export default function LogDetailModal({
  entry,
  breakdown,
  onClose,
}: {
  entry: any
  breakdown?: any
  onClose: () => void
}) {
  if (!entry) return null

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: 640, width: 'min(640px, 95vw)', boxSizing: 'border-box', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Log Details</h3>
            <div style={{ color: '#475569', fontSize: 13 }}>{entry.shift_date} · Hour {entry.hour}:00</div>
          </div>
          <div>
            <button className="secondary-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{entry.assets?.[0]?.asset_code || entry.machine_id}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{entry.machine_role || ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700 }}>{entry.haul_distance ?? '-'} m</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{entry.status || ''}</div>
            </div>
          </div>

          <div>
            <strong>Activity:</strong> {entry.activity}
          </div>

          <div>
            <strong>Loads:</strong> {entry.number_of_loads ?? '-'}
          </div>

          {entry.activity === 'Breakdown' && breakdown && (
            <div style={{ borderTop: '1px solid #eef2ff', paddingTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Breakdown</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Start</div>
                  <div style={{ fontWeight: 600 }}>{breakdown.breakdown_start ? new Date(breakdown.breakdown_start).toLocaleString() : '-'}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Reason</div>
                  <div style={{ fontWeight: 600 }}>{breakdown.reason || '-'}</div>
                </div>

                <div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Reported by</div>
                  <div style={{ fontWeight: 600 }}>{breakdown.reporter_name || breakdown.reported_by}</div>
                </div>

                <div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Status</div>
                  <div style={{ fontWeight: 600 }}>{breakdown.status || '-'}</div>
                </div>
                <div />
              </div>

              {/* Description / additional text */}
              {(
                breakdown.other_reason ||
                breakdown.description ||
                breakdown.details ||
                breakdown.additional_info ||
                breakdown.please_describe ||
                breakdown.notes
              ) && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Details</div>
                  <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{(breakdown.other_reason || breakdown.description || breakdown.details || breakdown.additional_info || breakdown.please_describe || breakdown.notes) as string}</div>
                </div>
              )}

              {/* Any other fields */}
              {Object.entries(breakdown)
                .filter(([k]) => ![
                  'id',
                  'reason',
                  'breakdown_start',
                  'asset_id',
                  'created_at',
                  'other_reason',
                  'description',
                  'details',
                  'additional_info',
                  'please_describe',
                  'notes',
                  'reported_by',
                  'reporter_name',
                  'site',
                  'status',
                ].includes(k))
                .map(([k, v]) => (v ? (
                  <div key={k} style={{ marginTop: 8 }}>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{k.replace(/_/g, ' ')}</div>
                    <div style={{ fontWeight: 600 }}>{String(v)}</div>
                  </div>
                ) : null))}
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="secondary-btn" onClick={onClose} style={{ height: 40 }}>Close</button>
        </div>
      </div>
    </div>
  )
}

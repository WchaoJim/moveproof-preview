import React, { useMemo, useRef, useState } from 'react'

type Status = '' | 'normal' | 'issue' | 'review'
type Photo = { id: string; name: string; url: string }
type ItemRecord = { status: Status; notes: string; photos: Photo[] }
type Session = Record<string, Record<string, ItemRecord>>
type MeterRecord = { water: string; electricity: string; gas: string; photos: Photo[] }
type Property = {
  id: string
  title: string
  address: string
  inspections: { move_in: Session; move_out: Session }
  meters: { move_in: MeterRecord; move_out: MeterRecord }
  exports: { id: string; type: string; token: string }[]
}

const AREAS = [
  { name: 'Entry / Hallway', items: ['Front door', 'Door lock', 'Keys', 'Access card'] },
  { name: 'Living Room', items: ['Walls', 'Floor', 'Ceiling', 'Window', 'Lights', 'AC'] },
  { name: 'Bedroom', items: ['Walls', 'Floor', 'Wardrobe', 'Bed frame', 'Window', 'Lights'] },
  { name: 'Kitchen', items: ['Sink', 'Countertop', 'Cabinets', 'Stove', 'Range hood', 'Fridge'] },
  { name: 'Bathroom', items: ['Toilet', 'Sink', 'Shower', 'Vent', 'Drain', 'Tiles'] },
]

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'issue', label: 'Issue' },
  { value: 'review', label: 'Review' },
]

const DEMO_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e2e8f0"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient></defs>
  <rect width="600" height="400" fill="url(#g)"/>
  <rect x="60" y="80" width="480" height="240" rx="20" fill="#f8fafc" stroke="#94a3b8" stroke-width="5"/>
  <text x="50%" y="52%" text-anchor="middle" font-family="Arial" font-size="28" fill="#475569">MoveProof Demo Image</text>
</svg>`)

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function blankSession(): Session {
  const out: Session = {}
  for (const area of AREAS) {
    out[area.name] = {}
    for (const item of area.items) {
      out[area.name][item] = { status: '', notes: '', photos: [] }
    }
  }
  return out
}

function makeProperty(title: string, address: string): Property {
  return {
    id: uid(),
    title,
    address,
    inspections: { move_in: blankSession(), move_out: blankSession() },
    meters: {
      move_in: { water: '', electricity: '', gas: '', photos: [] },
      move_out: { water: '', electricity: '', gas: '', photos: [] },
    },
    exports: [],
  }
}

async function filesToPhotos(files: File[]) {
  const out: Photo[] = []
  for (const file of files) {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    out.push({ id: uid(), name: file.name, url })
  }
  return out
}

function badgeStyle(status: Status) {
  if (status === 'normal') return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
  if (status === 'issue') return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' }
  if (status === 'review') return { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' }
  return { bg: '#ffffff', color: '#94a3b8', border: '#cbd5e1' }
}

function statusText(status: Status) {
  if (status === 'normal') return 'Normal'
  if (status === 'issue') return 'Issue'
  if (status === 'review') return 'Review'
  return 'Not recorded'
}

function TopBar({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {onBack ? (
          <button onClick={onBack} style={secondaryButtonStyle}>返回</button>
        ) : null}
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
          {subtitle ? <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{subtitle}</div> : null}
        </div>
      </div>
    </div>
  )
}

function AppButton({ children, onClick, primary = false }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={primary ? primaryButtonStyle : secondaryButtonStyle}>
      {children}
    </button>
  )
}

function PhotoButtons({ onLibraryFiles, onCameraFiles, onDemo }: { onLibraryFiles: (files: File[]) => void; onCameraFiles: (files: File[]) => void; onDemo: () => void }) {
  const libRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input ref={libRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
        const files = Array.from(e.target.files || [])
        if (files.length) onLibraryFiles(files)
        e.target.value = ''
      }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => {
        const files = Array.from(e.target.files || [])
        if (files.length) onCameraFiles(files)
        e.target.value = ''
      }} />
      <button style={secondaryButtonStyle} onClick={() => libRef.current?.click()}>相册</button>
      <button style={secondaryButtonStyle} onClick={() => camRef.current?.click()}>相机</button>
      <button style={secondaryButtonStyle} onClick={onDemo}>Demo图</button>
    </div>
  )
}

function PhotoGrid({ photos, onDelete }: { photos: Photo[]; onDelete: (id: string) => void }) {
  if (!photos.length) return <div style={emptyBoxStyle}>还没有图片</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {photos.map(photo => (
        <div key={photo.id} style={{ border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', background: '#f8fafc' }}>
          <img src={photo.url} alt={photo.name} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: 8 }}>
            <div style={{ fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.name}</div>
            <button style={{ ...secondaryButtonStyle, padding: '6px 10px', fontSize: 12 }} onClick={() => onDelete(photo.id)}>删除</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<'home' | 'property' | 'inspection' | 'item' | 'meters' | 'export' | 'shared'>('home')
  const [sessionType, setSessionType] = useState<'move_in' | 'move_out'>('move_in')
  const [meterMode, setMeterMode] = useState<'move_in' | 'move_out'>('move_in')
  const [areaName, setAreaName] = useState(AREAS[0].name)
  const [itemName, setItemName] = useState(AREAS[0].items[0])
  const [exportMode, setExportMode] = useState('Move-in report')
  const [shareToken, setShareToken] = useState('preview-demo-token')
  const [title, setTitle] = useState('Seattle Apt 302')
  const [address, setAddress] = useState('Belltown, Seattle, WA')
  const [property, setProperty] = useState<Property>(() => makeProperty('Seattle Apt 302', 'Belltown, Seattle, WA'))

  const item = property.inspections[sessionType][areaName][itemName]
  const moveInReference = property.inspections.move_in[areaName][itemName]
  const meter = property.meters[meterMode]

  async function addItemPhotos(files: File[]) {
    const photos = await filesToPhotos(files)
    setProperty(prev => ({
      ...prev,
      inspections: {
        ...prev.inspections,
        [sessionType]: {
          ...prev.inspections[sessionType],
          [areaName]: {
            ...prev.inspections[sessionType][areaName],
            [itemName]: { ...prev.inspections[sessionType][areaName][itemName], photos: [...prev.inspections[sessionType][areaName][itemName].photos, ...photos] }
          }
        }
      }
    }))
  }

  function addDemoItemPhoto() {
    setProperty(prev => ({
      ...prev,
      inspections: {
        ...prev.inspections,
        [sessionType]: {
          ...prev.inspections[sessionType],
          [areaName]: {
            ...prev.inspections[sessionType][areaName],
            [itemName]: { ...prev.inspections[sessionType][areaName][itemName], photos: [...prev.inspections[sessionType][areaName][itemName].photos, { id: uid(), name: 'demo-image', url: DEMO_IMG }] }
          }
        }
      }
    }))
  }

  function removeItemPhoto(id: string) {
    setProperty(prev => ({
      ...prev,
      inspections: {
        ...prev.inspections,
        [sessionType]: {
          ...prev.inspections[sessionType],
          [areaName]: {
            ...prev.inspections[sessionType][areaName],
            [itemName]: { ...prev.inspections[sessionType][areaName][itemName], photos: prev.inspections[sessionType][areaName][itemName].photos.filter(p => p.id !== id) }
          }
        }
      }
    }))
  }

  async function addMeterPhotos(files: File[]) {
    const photos = await filesToPhotos(files)
    setProperty(prev => ({
      ...prev,
      meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], photos: [...prev.meters[meterMode].photos, ...photos] } }
    }))
  }

  function addDemoMeterPhoto() {
    setProperty(prev => ({
      ...prev,
      meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], photos: [...prev.meters[meterMode].photos, { id: uid(), name: 'demo-meter', url: DEMO_IMG }] } }
    }))
  }

  function removeMeterPhoto(id: string) {
    setProperty(prev => ({
      ...prev,
      meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], photos: prev.meters[meterMode].photos.filter(p => p.id !== id) } }
    }))
  }

  function nextInspectionItem() {
    const areaIndex = AREAS.findIndex(a => a.name === areaName)
    const itemIndex = AREAS[areaIndex].items.findIndex(i => i === itemName)
    if (itemIndex < AREAS[areaIndex].items.length - 1) {
      setItemName(AREAS[areaIndex].items[itemIndex + 1])
      return
    }
    if (areaIndex < AREAS.length - 1) {
      setAreaName(AREAS[areaIndex + 1].name)
      setItemName(AREAS[areaIndex + 1].items[0])
      return
    }
    setScreen('inspection')
  }

  function generateReport() {
    const token = `token-${uid()}`
    setShareToken(token)
    setProperty(prev => ({ ...prev, exports: [{ id: uid(), type: exportMode, token }, ...prev.exports] }))
    setScreen('shared')
  }

  const reportEntries = useMemo(() => {
    const source = exportMode === 'Move-out report' ? property.inspections.move_out : property.inspections.move_in
    return AREAS.map(area => ({
      area: area.name,
      entries: area.items.map(itemKey => ({ item: itemKey, ...source[area.name][itemKey] })).filter(x => x.status || x.notes || x.photos.length)
    })).filter(x => x.entries.length)
  }, [exportMode, property])

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={phoneStyle}>
          <TopBar
            title={screen === 'home' ? 'MoveProof' : screen === 'property' ? property.title : screen === 'inspection' ? (sessionType === 'move_in' ? 'Move-in inspection' : 'Move-out inspection') : screen === 'item' ? itemName : screen === 'meters' ? 'Meters & handover' : screen === 'export' ? 'Export evidence pack' : 'Shared evidence pack'}
            subtitle={screen === 'home' ? 'GitHub / Vercel preview version' : screen === 'property' ? property.address : screen === 'item' ? areaName : screen === 'meters' ? property.title : screen === 'export' ? property.title : exportMode}
            onBack={screen === 'home' ? undefined : () => setScreen(screen === 'property' ? 'home' : screen === 'inspection' ? 'property' : screen === 'item' ? 'inspection' : screen === 'meters' ? 'property' : screen === 'export' ? 'property' : 'property')}
          />

          <div style={{ padding: 20, display: 'grid', gap: 16 }}>
            {screen === 'home' && (
              <>
                <div style={{ ...cardDarkStyle }}>
                  <div style={{ color: '#cbd5e1', fontSize: 14 }}>GitHub preview package</div>
                  <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>MoveProof</div>
                  <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                    <button style={{ ...buttonDarkLightStyle }} onClick={() => setScreen('property')}>进入房屋详情</button>
                    <button style={{ ...buttonDarkGhostStyle }} onClick={() => { setSessionType('move_in'); setScreen('inspection') }}>进入入住检查</button>
                    <button style={{ ...buttonDarkGhostStyle }} onClick={() => { setMeterMode('move_in'); setScreen('meters') }}>进入表计页</button>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={sectionLabelStyle}>快速建档</div>
                  <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                    <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="房屋名称" />
                    <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="地址" />
                    <button style={primaryButtonStyle} onClick={() => { setProperty(makeProperty(title || 'New Property', address || 'Unknown address')); setScreen('property') }}>创建新房屋</button>
                  </div>
                </div>
              </>
            )}

            {screen === 'property' && (
              <>
                <div style={cardDarkStyle}>
                  <div style={{ color: '#cbd5e1', fontSize: 14 }}>房屋信息</div>
                  <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{property.title}</div>
                  <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 14 }}>{property.address}</div>
                </div>
                <button style={cardButtonStyle} onClick={() => { setSessionType('move_in'); setScreen('inspection') }}>入住检查</button>
                <button style={cardButtonStyle} onClick={() => { setSessionType('move_out'); setScreen('inspection') }}>退租检查</button>
                <button style={cardButtonStyle} onClick={() => { setMeterMode('move_in'); setScreen('meters') }}>表计与交接物</button>
                <button style={cardButtonStyle} onClick={() => setScreen('export')}>导出报告</button>
              </>
            )}

            {screen === 'inspection' && (
              <>
                {AREAS.map(area => (
                  <div key={area.name} style={cardStyle}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{area.name}</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {area.items.map(name => {
                        const rec = property.inspections[sessionType][area.name][name]
                        const st = badgeStyle(rec.status)
                        return (
                          <button key={name} style={rowButtonStyle} onClick={() => { setAreaName(area.name); setItemName(name); setScreen('item') }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{name}</div>
                              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{rec.photos.length} image(s)</div>
                            </div>
                            <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>{statusText(rec.status)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {screen === 'item' && (
              <>
                <div style={cardStyle}>
                  <div style={sectionLabelStyle}>检查项</div>
                  <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{itemName}</div>
                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 14 }}>{areaName}</div>
                </div>

                <div style={cardStyle}>
                  <div style={sectionLabelStyle}>状态</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                    {STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} style={item.status === opt.value ? selectedStatusStyle : unselectedStatusStyle} onClick={() => setProperty(prev => ({
                        ...prev,
                        inspections: {
                          ...prev.inspections,
                          [sessionType]: {
                            ...prev.inspections[sessionType],
                            [areaName]: {
                              ...prev.inspections[sessionType][areaName],
                              [itemName]: { ...prev.inspections[sessionType][areaName][itemName], status: opt.value }
                            }
                          }
                        }
                      }))}>{opt.label}</button>
                    ))}
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={sectionLabelStyle}>图片</div>
                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 14 }}>这里已修正为：相册 / 相机 / 删除</div>
                  <div style={{ marginTop: 12 }}>
                    <PhotoButtons onLibraryFiles={addItemPhotos} onCameraFiles={addItemPhotos} onDemo={addDemoItemPhoto} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <PhotoGrid photos={item.photos} onDelete={removeItemPhoto} />
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={sectionLabelStyle}>备注</div>
                  <textarea style={{ ...inputStyle, minHeight: 110, resize: 'vertical', marginTop: 12 }} value={item.notes} onChange={(e) => setProperty(prev => ({
                    ...prev,
                    inspections: {
                      ...prev.inspections,
                      [sessionType]: {
                        ...prev.inspections[sessionType],
                        [areaName]: {
                          ...prev.inspections[sessionType][areaName],
                          [itemName]: { ...prev.inspections[sessionType][areaName][itemName], notes: e.target.value }
                        }
                      }
                    }
                  }))} placeholder="输入问题描述" />
                </div>

                {sessionType === 'move_out' && (moveInReference.status || moveInReference.notes || moveInReference.photos.length) ? (
                  <div style={{ ...cardStyle, background: '#fffbeb', borderColor: '#fde68a' }}>
                    <div style={{ ...sectionLabelStyle, color: '#92400e' }}>入住参考</div>
                    <div style={{ marginTop: 12 }}><span style={{ ...statusBadgeInline(moveInReference.status) }}>{statusText(moveInReference.status)}</span></div>
                    <div style={{ marginTop: 12, color: '#78350f', fontSize: 14 }}>{moveInReference.notes || '无备注'}</div>
                    <div style={{ marginTop: 12 }}><PhotoGrid photos={moveInReference.photos} onDelete={() => {}} /></div>
                  </div>
                ) : null}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <AppButton onClick={() => setScreen('inspection')}>保存</AppButton>
                  <AppButton primary onClick={nextInspectionItem}>保存并下一个</AppButton>
                </div>
              </>
            )}

            {screen === 'meters' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f1f5f9', borderRadius: 24, padding: 4 }}>
                  <button style={meterMode === 'move_in' ? tabSelectedStyle : tabStyle} onClick={() => setMeterMode('move_in')}>Move-in</button>
                  <button style={meterMode === 'move_out' ? tabSelectedStyle : tabStyle} onClick={() => setMeterMode('move_out')}>Move-out</button>
                </div>

                <div style={cardStyle}>
                  <div style={sectionLabelStyle}>表计读数</div>
                  <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                    <input style={inputStyle} value={meter.water} onChange={(e) => setProperty(prev => ({ ...prev, meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], water: e.target.value } } }))} placeholder="Water" />
                    <input style={inputStyle} value={meter.electricity} onChange={(e) => setProperty(prev => ({ ...prev, meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], electricity: e.target.value } } }))} placeholder="Electricity" />
                    <input style={inputStyle} value={meter.gas} onChange={(e) => setProperty(prev => ({ ...prev, meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], gas: e.target.value } } }))} placeholder="Gas" />
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={sectionLabelStyle}>表计图片</div>
                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 14 }}>这里也已修正为：相册 / 相机 / 删除</div>
                  <div style={{ marginTop: 12 }}>
                    <PhotoButtons onLibraryFiles={addMeterPhotos} onCameraFiles={addMeterPhotos} onDemo={addDemoMeterPhoto} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <PhotoGrid photos={meter.photos} onDelete={removeMeterPhoto} />
                  </div>
                </div>

                <AppButton primary onClick={() => setScreen('property')}>保存并返回</AppButton>
              </>
            )}

            {screen === 'export' && (
              <>
                <div style={cardStyle}>
                  <div style={sectionLabelStyle}>导出内容</div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                    {['Move-in report', 'Move-out report', 'Full comparison pack'].map(mode => (
                      <button key={mode} style={exportMode === mode ? selectedExportStyle : unselectedExportStyle} onClick={() => setExportMode(mode)}>{mode}</button>
                    ))}
                  </div>
                </div>
                <AppButton primary onClick={generateReport}>打开报告预览</AppButton>
                <AppButton onClick={() => exportJSON('moveproof-data.json', property)}>下载 JSON 数据</AppButton>
              </>
            )}

            {screen === 'shared' && (
              <>
                <div style={cardDarkStyle}>
                  <div style={{ color: '#cbd5e1', fontSize: 14 }}>Rental Evidence Pack</div>
                  <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{property.title}</div>
                  <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 14 }}>{property.address}</div>
                  <div style={{ marginTop: 12, color: '#cbd5e1', fontSize: 12 }}>Token: {shareToken}</div>
                </div>
                {reportEntries.length ? reportEntries.map(block => (
                  <div key={block.area} style={cardStyle}>
                    <div style={{ fontWeight: 700 }}>{block.area}</div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                      {block.entries.map(entry => (
                        <div key={entry.item} style={{ background: '#f8fafc', borderRadius: 16, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontWeight: 600 }}>{entry.item}</div>
                            <span style={statusBadgeInline(entry.status)}>{statusText(entry.status)}</span>
                          </div>
                          <div style={{ marginTop: 8, color: '#475569', fontSize: 14 }}>{entry.notes || 'No note.'}</div>
                          {entry.photos.length ? <div style={{ marginTop: 12 }}><PhotoGrid photos={entry.photos} onDelete={() => {}} /></div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )) : <div style={emptyBoxStyle}>当前报告还没有可展示的检查项。</div>}
                <AppButton onClick={() => window.print()}>打印当前报告</AppButton>
              </>
            )}
          </div>
        </div>

        <div style={rightPanelStyle}>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '6px 12px', borderRadius: 999, fontSize: 14, color: '#334155' }}>给小白用的 GitHub 上传包</div>
          <h1 style={{ marginTop: 16, fontSize: 36, lineHeight: 1.1, marginBottom: 0 }}>这份代码可以直接放进 GitHub，再交给 Vercel 预览。</h1>
          <div style={{ marginTop: 16, color: '#475569', lineHeight: 1.8 }}>
            <p>你刚刚发现的两个图片问题，已经体现在这个项目里：</p>
            <p>1. 点“相册”走图库选择。</p>
            <p>2. 点“相机”尽量走摄像头入口。</p>
            <p>3. 所有新增图片都能删除。</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = { minHeight: '100vh', background: '#f1f5f9', padding: 16 }
const shellStyle: React.CSSProperties = { maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 24, gridTemplateColumns: '420px 1fr' }
const phoneStyle: React.CSSProperties = { minHeight: 860, overflow: 'hidden', borderRadius: 28, background: '#fff', boxShadow: '0 20px 60px rgba(15,23,42,.12)', border: '1px solid #e2e8f0' }
const rightPanelStyle: React.CSSProperties = { background: '#fff', borderRadius: 28, padding: 32, border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15,23,42,.06)' }
const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 24, padding: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(15,23,42,.04)' }
const cardDarkStyle: React.CSSProperties = { background: '#0f172a', color: '#fff', borderRadius: 24, padding: 20 }
const cardButtonStyle: React.CSSProperties = { width: '100%', borderRadius: 18, border: '1px solid #e2e8f0', background: '#fff', padding: 16, textAlign: 'left', fontSize: 16, cursor: 'pointer' }
const rowButtonStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: 'none', borderRadius: 16, padding: 12, background: '#fff', textAlign: 'left', cursor: 'pointer' }
const primaryButtonStyle: React.CSSProperties = { width: '100%', borderRadius: 16, border: 'none', background: '#0f172a', color: '#fff', padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const secondaryButtonStyle: React.CSSProperties = { width: '100%', borderRadius: 16, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', padding: '12px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const inputStyle: React.CSSProperties = { width: '100%', borderRadius: 16, border: '1px solid #cbd5e1', padding: '12px 16px', fontSize: 14, outline: 'none' }
const emptyBoxStyle: React.CSSProperties = { borderRadius: 16, border: '1px dashed #cbd5e1', padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14, background: '#fff' }
const selectedStatusStyle: React.CSSProperties = { borderRadius: 16, border: '1px solid #0f172a', background: '#0f172a', color: '#fff', padding: '12px 10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const unselectedStatusStyle: React.CSSProperties = { borderRadius: 16, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', padding: '12px 10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const sectionLabelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#64748b' }
const tabStyle: React.CSSProperties = { borderRadius: 20, padding: '12px 16px', background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }
const tabSelectedStyle: React.CSSProperties = { borderRadius: 20, padding: '12px 16px', background: '#fff', border: 'none', color: '#0f172a', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 4px rgba(15,23,42,.08)' }
const selectedExportStyle: React.CSSProperties = { borderRadius: 16, border: '1px solid #0f172a', background: '#0f172a', color: '#fff', padding: '16px', textAlign: 'left', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const unselectedExportStyle: React.CSSProperties = { borderRadius: 16, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', padding: '16px', textAlign: 'left', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
function statusBadgeInline(status: Status): React.CSSProperties {
  const st = badgeStyle(status)
  return { background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600 }
}

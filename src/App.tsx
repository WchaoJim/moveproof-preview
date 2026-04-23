
import React, { useMemo, useRef, useState } from 'react'

type Photo = { id: string; name: string; url: string }
type ItemRecord = { status: string; notes: string; photos: Photo[] }
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
const STATUS_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'issue', label: 'Issue' },
  { value: 'review', label: 'Review' },
]

const DEMO_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#bfdbfe"/></linearGradient></defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <rect x="60" y="80" width="480" height="240" rx="22" fill="#ffffff" stroke="#94a3b8" stroke-width="5"/>
    <text x="50%" y="52%" text-anchor="middle" font-family="Arial" font-size="28" fill="#334155">MoveProof Demo Image</text>
  </svg>`)

function uid() { return Math.random().toString(36).slice(2, 10) }

function blankSession(): Session {
  const out: Session = {}
  for (const area of AREAS) {
    out[area.name] = {}
    for (const item of area.items) out[area.name][item] = { status: '', notes: '', photos: [] }
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

async function filesToPhotos(files: File[]): Promise<Photo[]> {
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

function exportJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function statusLabel(status: string) {
  if (status === 'normal') return 'Normal'
  if (status === 'issue') return 'Issue'
  if (status === 'review') return 'Review'
  return 'Not recorded'
}

function statusStyle(status: string): React.CSSProperties {
  if (status === 'normal') return { ...pillBaseStyle, background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }
  if (status === 'issue') return { ...pillBaseStyle, background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }
  if (status === 'review') return { ...pillBaseStyle, background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }
  return { ...pillBaseStyle, background: '#fff', color: '#94a3b8', borderColor: '#e2e8f0' }
}

function TopBar({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: null | (() => void) }) {
  return (
    <div style={topBarStyle}>
      {onBack ? <button onClick={onBack} style={ghostButtonStyle}>返回</button> : null}
      <div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{title}</div>
        {subtitle ? <div style={{ marginTop: 8, color: '#64748b', fontSize: 15, lineHeight: 1.35 }}>{subtitle}</div> : null}
      </div>
    </div>
  )
}

function Button({ children, onClick, primary = false }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return <button onClick={onClick} style={primary ? darkButtonStyle : secondaryButtonStyle}>{children}</button>
}

function PhotoButtons({ onLibraryFiles, onCameraFiles, onDemo }: { onLibraryFiles: (files: File[]) => void; onCameraFiles: (files: File[]) => void; onDemo: () => void }) {
  const libRef = useRef<HTMLInputElement | null>(null)
  const camRef = useRef<HTMLInputElement | null>(null)
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <input ref={libRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) onLibraryFiles(files); e.target.value = '' }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) onCameraFiles(files); e.target.value = '' }} />
      <button style={secondaryButtonStyle} onClick={() => libRef.current?.click()}>相册</button>
      <button style={secondaryButtonStyle} onClick={() => camRef.current?.click()}>相机</button>
      <button style={secondaryButtonStyle} onClick={onDemo}>Demo图</button>
    </div>
  )
}

function PhotoGrid({ photos, onDelete, readOnly = false }: { photos: Photo[]; onDelete: (id: string) => void; readOnly?: boolean }) {
  if (!photos.length) return <div style={emptyPhotoStyle}>还没有图片</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
      {photos.map((photo) => (
        <div key={photo.id} style={photoCardStyle}>
          <img src={photo.url} alt={photo.name} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
          <div style={{ padding: 10, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.name}</div>
            {!readOnly ? <button style={deleteButtonStyle} onClick={() => onDelete(photo.id)}>删除</button> : null}
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
  const [titleInput, setTitleInput] = useState('Seattle Apt 302')
  const [addressInput, setAddressInput] = useState('Belltown, Seattle, WA')
  const [property, setProperty] = useState<Property>(() => makeProperty('Seattle Apt 302', 'Belltown, Seattle, WA'))

  const item = property.inspections[sessionType][areaName][itemName]
  const moveInReference = property.inspections.move_in[areaName][itemName]
  const meter = property.meters[meterMode]

  async function addItemPhotos(files: File[]) {
    const photos = await filesToPhotos(files)
    setProperty((prev) => ({
      ...prev,
      inspections: {
        ...prev.inspections,
        [sessionType]: {
          ...prev.inspections[sessionType],
          [areaName]: { ...prev.inspections[sessionType][areaName], [itemName]: { ...prev.inspections[sessionType][areaName][itemName], photos: [...prev.inspections[sessionType][areaName][itemName].photos, ...photos] } },
        },
      },
    }))
  }

  function addDemoItemPhoto() {
    setProperty((prev) => ({
      ...prev,
      inspections: {
        ...prev.inspections,
        [sessionType]: {
          ...prev.inspections[sessionType],
          [areaName]: { ...prev.inspections[sessionType][areaName], [itemName]: { ...prev.inspections[sessionType][areaName][itemName], photos: [...prev.inspections[sessionType][areaName][itemName].photos, { id: uid(), name: 'demo-image', url: DEMO_IMG }] } },
        },
      },
    }))
  }

  function removeItemPhoto(id: string) {
    setProperty((prev) => ({
      ...prev,
      inspections: {
        ...prev.inspections,
        [sessionType]: {
          ...prev.inspections[sessionType],
          [areaName]: { ...prev.inspections[sessionType][areaName], [itemName]: { ...prev.inspections[sessionType][areaName][itemName], photos: prev.inspections[sessionType][areaName][itemName].photos.filter((p) => p.id !== id) } },
        },
      },
    }))
  }

  async function addMeterPhotos(files: File[]) {
    const photos = await filesToPhotos(files)
    setProperty((prev) => ({ ...prev, meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], photos: [...prev.meters[meterMode].photos, ...photos] } } }))
  }

  function addDemoMeterPhoto() {
    setProperty((prev) => ({ ...prev, meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], photos: [...prev.meters[meterMode].photos, { id: uid(), name: 'demo-meter', url: DEMO_IMG }] } } }))
  }

  function removeMeterPhoto(id: string) {
    setProperty((prev) => ({ ...prev, meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], photos: prev.meters[meterMode].photos.filter((p) => p.id !== id) } } }))
  }

  function nextInspectionItem() {
    const areaIndex = AREAS.findIndex((a) => a.name === areaName)
    const itemIndex = AREAS[areaIndex].items.findIndex((i) => i === itemName)
    if (itemIndex < AREAS[areaIndex].items.length - 1) return void setItemName(AREAS[areaIndex].items[itemIndex + 1])
    if (areaIndex < AREAS.length - 1) { setAreaName(AREAS[areaIndex + 1].name); setItemName(AREAS[areaIndex + 1].items[0]); return }
    setScreen('inspection')
  }

  function generateReport() {
    const token = `token-${uid()}`
    setShareToken(token)
    setProperty((prev) => ({ ...prev, exports: [{ id: uid(), type: exportMode, token }, ...prev.exports] }))
    setScreen('shared')
  }

  const reportEntries = useMemo(() => {
    const source = exportMode === 'Move-out report' ? property.inspections.move_out : property.inspections.move_in
    return AREAS.map((area) => ({ area: area.name, entries: area.items.map((itemKey) => ({ item: itemKey, ...source[area.name][itemKey] })).filter((x) => x.status || x.notes || x.photos.length) })).filter((x) => x.entries.length)
  }, [exportMode, property])

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={phoneStyle}>
          <TopBar
            title={screen === 'home' ? 'MoveProof' : screen === 'property' ? property.title : screen === 'inspection' ? (sessionType === 'move_in' ? 'Move-in inspection' : 'Move-out inspection') : screen === 'item' ? itemName : screen === 'meters' ? 'Meters & handover' : screen === 'export' ? 'Export evidence pack' : 'Shared evidence pack'}
            subtitle={screen === 'home' ? 'GitHub Pages stable version' : screen === 'property' ? property.address : screen === 'item' ? areaName : screen === 'meters' ? property.title : screen === 'export' ? property.title : exportMode}
            onBack={screen === 'home' ? null : () => setScreen(screen === 'property' ? 'home' : screen === 'inspection' ? 'property' : screen === 'item' ? 'inspection' : screen === 'meters' ? 'property' : screen === 'export' ? 'property' : 'property')}
          />

          {screen === 'home' ? (
            <div style={contentStyle}>
              <div style={heroStyle}>
                <div style={{ fontSize: 14, opacity: 0.8 }}>Mobile-first version</div>
                <div style={{ marginTop: 8, fontSize: 34, fontWeight: 800 }}>MoveProof</div>
                <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                  <button style={buttonDarkLightStyle} onClick={() => setScreen('property')}>进入房屋详情</button>
                  <button style={buttonDarkGhostStyle} onClick={() => { setSessionType('move_in'); setScreen('inspection') }}>进入入住检查</button>
                  <button style={buttonDarkGhostStyle} onClick={() => { setMeterMode('move_in'); setScreen('meters') }}>进入表计页</button>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={sectionLabelStyle}>快速建档</div>
                <div style={{ display: 'grid', gap: 14 }}>
                  <input style={inputStyle} value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="房屋名称" />
                  <input style={inputStyle} value={addressInput} onChange={(e) => setAddressInput(e.target.value)} placeholder="地址" />
                  <button style={darkButtonStyle} onClick={() => { setProperty(makeProperty(titleInput || 'New Property', addressInput || 'Unknown address')); setScreen('property') }}>创建新房屋</button>
                </div>
              </div>
            </div>
          ) : null}

          {screen === 'property' ? (
            <div style={contentStyle}>
              <div style={heroStyle}>
                <div style={{ fontSize: 14, opacity: 0.8 }}>房屋信息</div>
                <div style={{ marginTop: 8, fontSize: 34, fontWeight: 800 }}>{property.title}</div>
                <div style={{ marginTop: 8, fontSize: 16, opacity: 0.9 }}>{property.address}</div>
              </div>
              <button style={lightButtonStyle} onClick={() => { setSessionType('move_in'); setScreen('inspection') }}>入住检查</button>
              <button style={lightButtonStyle} onClick={() => { setSessionType('move_out'); setScreen('inspection') }}>退租检查</button>
              <button style={lightButtonStyle} onClick={() => { setMeterMode('move_in'); setScreen('meters') }}>表计与交接物</button>
              <button style={lightButtonStyle} onClick={() => setScreen('export')}>导出报告</button>
            </div>
          ) : null}

          {screen === 'inspection' ? (
            <div style={contentStyle}>
              {AREAS.map((area) => (
                <div key={area.name} style={cardStyle}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{area.name}</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {area.items.map((name) => {
                      const rec = property.inspections[sessionType][area.name][name]
                      return (
                        <button key={name} style={listButtonStyle} onClick={() => { setAreaName(area.name); setItemName(name); setScreen('item') }}>
                          <div><div style={{ fontWeight: 600, color: '#1e293b' }}>{name}</div><div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>{rec.photos.length} image(s)</div></div>
                          <span style={statusStyle(rec.status)}>{statusLabel(rec.status)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {screen === 'item' ? (
            <div style={contentStyle}>
              <div style={cardStyle}><div style={sectionLabelStyle}>检查项</div><div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{itemName}</div><div style={{ marginTop: 8, color: '#64748b' }}>{areaName}</div></div>

              <div style={cardStyle}>
                <div style={sectionLabelStyle}>状态</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
                  {STATUS_OPTIONS.map((opt) => (
                    <button key={opt.value} style={item.status === opt.value ? selectedButtonStyle : smallButtonStyle} onClick={() => setProperty((prev) => ({ ...prev, inspections: { ...prev.inspections, [sessionType]: { ...prev.inspections[sessionType], [areaName]: { ...prev.inspections[sessionType][areaName], [itemName]: { ...prev.inspections[sessionType][areaName][itemName], status: opt.value } } } } }))}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div style={cardStyle}><div style={sectionLabelStyle}>图片</div><div style={{ marginBottom: 12, color: '#64748b' }}>支持相册 / 相机 / 删除</div><PhotoButtons onLibraryFiles={addItemPhotos} onCameraFiles={addItemPhotos} onDemo={addDemoItemPhoto} /><div style={{ marginTop: 14 }}><PhotoGrid photos={item.photos} onDelete={removeItemPhoto} /></div></div>

              <div style={cardStyle}>
                <div style={sectionLabelStyle}>备注</div>
                <textarea style={textareaStyle} rows={4} value={item.notes} onChange={(e) => { const value = e.target.value; setProperty((prev) => ({ ...prev, inspections: { ...prev.inspections, [sessionType]: { ...prev.inspections[sessionType], [areaName]: { ...prev.inspections[sessionType][areaName], [itemName]: { ...prev.inspections[sessionType][areaName][itemName], notes: value } } } } })) }} placeholder="输入问题描述" />
              </div>

              {sessionType === 'move_out' && (moveInReference.status || moveInReference.notes || moveInReference.photos.length) ? (
                <div style={{ ...cardStyle, background: '#fffbeb', borderColor: '#fde68a' }}>
                  <div style={{ ...sectionLabelStyle, color: '#92400e' }}>入住参考</div>
                  <div><span style={statusStyle(moveInReference.status)}>{statusLabel(moveInReference.status)}</span></div>
                  <div style={{ marginTop: 12, color: '#92400e' }}>{moveInReference.notes || '无备注'}</div>
                  <div style={{ marginTop: 14 }}><PhotoGrid photos={moveInReference.photos} onDelete={() => {}} readOnly /></div>
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button style={secondaryButtonStyle} onClick={() => setScreen('inspection')}>保存</button>
                <button style={darkButtonStyle} onClick={nextInspectionItem}>保存并下一个</button>
              </div>
            </div>
          ) : null}

          {screen === 'meters' ? (
            <div style={contentStyle}>
              <div style={tabWrapStyle}>
                <button style={meterMode === 'move_in' ? tabActiveStyle : tabStyle} onClick={() => setMeterMode('move_in')}>Move-in</button>
                <button style={meterMode === 'move_out' ? tabActiveStyle : tabStyle} onClick={() => setMeterMode('move_out')}>Move-out</button>
              </div>

              <div style={cardStyle}>
                <div style={sectionLabelStyle}>表计读数</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <input style={inputStyle} value={meter.water} onChange={(e) => setProperty((prev) => ({ ...prev, meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], water: e.target.value } } }))} placeholder="Water" />
                  <input style={inputStyle} value={meter.electricity} onChange={(e) => setProperty((prev) => ({ ...prev, meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], electricity: e.target.value } } }))} placeholder="Electricity" />
                  <input style={inputStyle} value={meter.gas} onChange={(e) => setProperty((prev) => ({ ...prev, meters: { ...prev.meters, [meterMode]: { ...prev.meters[meterMode], gas: e.target.value } } }))} placeholder="Gas" />
                </div>
              </div>

              <div style={cardStyle}><div style={sectionLabelStyle}>表计图片</div><div style={{ marginBottom: 12, color: '#64748b' }}>支持相册 / 相机 / 删除</div><PhotoButtons onLibraryFiles={addMeterPhotos} onCameraFiles={addMeterPhotos} onDemo={addDemoMeterPhoto} /><div style={{ marginTop: 14 }}><PhotoGrid photos={meter.photos} onDelete={removeMeterPhoto} /></div></div>

              <button style={darkButtonStyle} onClick={() => setScreen('property')}>保存并返回</button>
            </div>
          ) : null}

          {screen === 'export' ? (
            <div style={contentStyle}>
              <div style={cardStyle}>
                <div style={sectionLabelStyle}>导出内容</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {['Move-in report', 'Move-out report', 'Full comparison pack'].map((mode) => (
                    <button key={mode} style={exportMode === mode ? selectedWideButtonStyle : lightButtonStyle} onClick={() => setExportMode(mode)}>{mode}</button>
                  ))}
                </div>
              </div>
              <button style={darkButtonStyle} onClick={generateReport}>打开报告预览</button>
              <button style={secondaryButtonStyle} onClick={() => exportJSON('moveproof-data.json', property)}>下载 JSON 数据</button>
            </div>
          ) : null}

          {screen === 'shared' ? (
            <div style={contentStyle}>
              <div style={heroStyle}><div style={{ fontSize: 14, opacity: 0.8 }}>Rental Evidence Pack</div><div style={{ marginTop: 8, fontSize: 34, fontWeight: 800 }}>{property.title}</div><div style={{ marginTop: 8, fontSize: 16, opacity: 0.9 }}>{property.address}</div><div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>Token: {shareToken}</div></div>
              {reportEntries.length ? reportEntries.map((block) => (
                <div key={block.area} style={cardStyle}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{block.area}</div>
                  <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                    {block.entries.map((entry) => (
                      <div key={entry.item} style={innerCardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{entry.item}</div>
                          <span style={statusStyle(entry.status)}>{statusLabel(entry.status)}</span>
                        </div>
                        <div style={{ marginTop: 10, color: '#475569' }}>{entry.notes || 'No note.'}</div>
                        {entry.photos.length ? <div style={{ marginTop: 14 }}><PhotoGrid photos={entry.photos} onDelete={() => {}} readOnly /></div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )) : <div style={emptyPhotoStyle}>当前报告还没有可展示的检查项。</div>}
              <button style={secondaryButtonStyle} onClick={() => window.print()}>打印当前报告</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = { minHeight: '100vh', background: '#f1f5f9', padding: 12, overflowX: 'hidden' }
const shellStyle: React.CSSProperties = { maxWidth: 440, margin: '0 auto' }
const phoneStyle: React.CSSProperties = { minHeight: '100vh', background: '#ffffff', borderRadius: 28, boxShadow: '0 12px 36px rgba(15,23,42,.10)', overflow: 'hidden', border: '1px solid #e2e8f0' }
const topBarStyle: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }
const contentStyle: React.CSSProperties = { padding: 20, display: 'grid', gap: 16 }
const heroStyle: React.CSSProperties = { background: '#0f172a', color: '#ffffff', borderRadius: 28, padding: 24 }
const cardStyle: React.CSSProperties = { background: '#ffffff', borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 18px rgba(15,23,42,.05)', padding: 20 }
const innerCardStyle: React.CSSProperties = { background: '#f8fafc', borderRadius: 18, padding: 16 }
const sectionLabelStyle: React.CSSProperties = { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 12 }
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', height: 52, borderRadius: 18, border: '1px solid #cbd5e1', padding: '0 16px', fontSize: 16, outline: 'none', background: '#ffffff' }
const textareaStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 18, border: '1px solid #cbd5e1', padding: 16, fontSize: 16, outline: 'none', background: '#ffffff', resize: 'vertical' }
const darkButtonStyle: React.CSSProperties = { width: '100%', borderRadius: 18, border: '1px solid #0f172a', background: '#0f172a', color: '#ffffff', padding: '14px 16px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
const secondaryButtonStyle: React.CSSProperties = { width: '100%', borderRadius: 18, border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b', padding: '14px 16px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }
const lightButtonStyle: React.CSSProperties = { width: '100%', borderRadius: 18, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', padding: '16px 18px', fontSize: 16, fontWeight: 700, textAlign: 'left', cursor: 'pointer' }
const buttonDarkLightStyle: React.CSSProperties = { ...lightButtonStyle, background: '#ffffff', color: '#0f172a', border: '1px solid #ffffff' }
const buttonDarkGhostStyle: React.CSSProperties = { ...lightButtonStyle, background: 'rgba(255,255,255,.10)', color: '#ffffff', border: '1px solid rgba(255,255,255,.18)' }
const selectedButtonStyle: React.CSSProperties = { borderRadius: 16, border: '1px solid #0f172a', background: '#0f172a', color: '#ffffff', padding: '12px 10px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const smallButtonStyle: React.CSSProperties = { borderRadius: 16, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', padding: '12px 10px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const selectedWideButtonStyle: React.CSSProperties = { ...lightButtonStyle, background: '#0f172a', color: '#ffffff', border: '1px solid #0f172a' }
const listButtonStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', borderRadius: 18, border: '1px solid #e2e8f0', background: '#ffffff', padding: '14px 16px', cursor: 'pointer' }
const ghostButtonStyle: React.CSSProperties = { borderRadius: 14, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', padding: '10px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const deleteButtonStyle: React.CSSProperties = { borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', padding: '4px 8px', fontSize: 12, cursor: 'pointer' }
const emptyPhotoStyle: React.CSSProperties = { borderRadius: 20, border: '1px dashed #cbd5e1', background: '#ffffff', padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 14 }
const photoCardStyle: React.CSSProperties = { overflow: 'hidden', borderRadius: 18, border: '1px solid #e2e8f0', background: '#f8fafc' }
const tabWrapStyle: React.CSSProperties = { background: '#e2e8f0', borderRadius: 20, padding: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }
const tabStyle: React.CSSProperties = { borderRadius: 16, border: 'none', background: 'transparent', color: '#64748b', padding: '12px 10px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const tabActiveStyle: React.CSSProperties = { ...tabStyle, background: '#ffffff', color: '#0f172a', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }
const pillBaseStyle: React.CSSProperties = { display: 'inline-block', borderRadius: 999, border: '1px solid', padding: '6px 10px', fontSize: 12, fontWeight: 700 }

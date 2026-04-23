import React, { useMemo, useRef, useState } from 'react'

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
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e2e8f0"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <rect x="60" y="80" width="480" height="240" rx="20" fill="#f8fafc" stroke="#94a3b8" stroke-width="5"/>
    <text x="50%" y="52%" text-anchor="middle" font-family="Arial" font-size="28" fill="#475569">MoveProof Demo Image</text>
  </svg>`)

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function badge(status: string) {
  if (status === 'normal') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'issue') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'review') return 'bg-slate-100 text-slate-700 border-slate-200'
  return 'bg-white text-slate-400 border-slate-200'
}

function statusText(status: string) {
  if (status === 'normal') return 'Normal'
  if (status === 'issue') return 'Issue'
  if (status === 'review') return 'Review'
  return 'Not recorded'
}

function blankSession() {
  const out: Record<string, Record<string, { status: string; notes: string; photos: Array<{ id: string; name: string; url: string }> }>> = {}
  for (const area of AREAS) {
    out[area.name] = {}
    for (const item of area.items) {
      out[area.name][item] = { status: '', notes: '', photos: [] }
    }
  }
  return out
}

function makeProperty(title: string, address: string) {
  return {
    id: uid(),
    title,
    address,
    inspections: {
      move_in: blankSession(),
      move_out: blankSession(),
    },
    meters: {
      move_in: { water: '', electricity: '', gas: '', photos: [] as Array<{ id: string; name: string; url: string }> },
      move_out: { water: '', electricity: '', gas: '', photos: [] as Array<{ id: string; name: string; url: string }> },
    },
    exports: [] as Array<{ id: string; type: string; token: string }>,
  }
}

async function filesToPhotos(files: File[]) {
  const out: Array<{ id: string; name: string; url: string }> = []
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
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function TopBar({
  title,
  subtitle,
  onBack,
}: {
  title: string
  subtitle?: string
  onBack: null | (() => void)
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 px-5 py-4 backdrop-blur">
      <div className="flex items-start gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            返回
          </button>
        ) : null}
        <div>
          <div className="text-lg font-semibold tracking-tight text-slate-900">{title}</div>
          {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}
        </div>
      </div>
    </div>
  )
}

function Button({
  children,
  onClick,
  primary = false,
}: {
  children: React.ReactNode
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={
        primary
          ? 'w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white'
          : 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700'
      }
    >
      {children}
    </button>
  )
}

function PhotoButtons({
  onLibraryFiles,
  onCameraFiles,
  onDemo,
}: {
  onLibraryFiles: (files: File[]) => void
  onCameraFiles: (files: File[]) => void
  onDemo: () => void
}) {
  const libRef = useRef<HTMLInputElement | null>(null)
  const camRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="flex flex-wrap gap-2">
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length) onLibraryFiles(files)
          e.target.value = ''
        }}
      />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length) onCameraFiles(files)
          e.target.value = ''
        }}
      />
      <button
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        onClick={() => libRef.current?.click()}
      >
        相册
      </button>
      <button
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        onClick={() => camRef.current?.click()}
      >
        相机
      </button>
      <button
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        onClick={onDemo}
      >
        Demo图
      </button>
    </div>
  )
}

function PhotoGrid({
  photos,
  onDelete,
}: {
  photos: Array<{ id: string; name: string; url: string }>
  onDelete: (id: string) => void
}) {
  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
        还没有图片
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map((photo) => (
        <div key={photo.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img src={photo.url} alt={photo.name} className="h-28 w-full object-cover" />
          <div className="flex items-center justify-between gap-2 p-2">
            <div className="truncate text-xs text-slate-700">{photo.name}</div>
            <button
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-white"
              onClick={() => onDelete(photo.id)}
            >
              删除
            </button>
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
  const [property, setProperty] = useState(() => makeProperty('Seattle Apt 302', 'Belltown, Seattle, WA'))

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
          [areaName]: {
            ...prev.inspections[sessionType][areaName],
            [itemName]: {
              ...prev.inspections[sessionType][areaName][itemName],
              photos: [...prev.inspections[sessionType][areaName][itemName].photos, ...photos],
            },
          },
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
          [areaName]: {
            ...prev.inspections[sessionType][areaName],
            [itemName]: {
              ...prev.inspections[sessionType][areaName][itemName],
              photos: [
                ...prev.inspections[sessionType][areaName][itemName].photos,
                { id: uid(), name: 'demo-image', url: DEMO_IMG },
              ],
            },
          },
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
          [areaName]: {
            ...prev.inspections[sessionType][areaName],
            [itemName]: {
              ...prev.inspections[sessionType][areaName][itemName],
              photos: prev.inspections[sessionType][areaName][itemName].photos.filter((p) => p.id !== id),
            },
          },
        },
      },
    }))
  }

  async function addMeterPhotos(files: File[]) {
    const photos = await filesToPhotos(files)
    setProperty((prev) => ({
      ...prev,
      meters: {
        ...prev.meters,
        [meterMode]: {
          ...prev.meters[meterMode],
          photos: [...prev.meters[meterMode].photos, ...photos],
        },
      },
    }))
  }

  function addDemoMeterPhoto() {
    setProperty((prev) => ({
      ...prev,
      meters: {
        ...prev.meters,
        [meterMode]: {
          ...prev.meters[meterMode],
          photos: [...prev.meters[meterMode].photos, { id: uid(), name: 'demo-meter', url: DEMO_IMG }],
        },
      },
    }))
  }

  function removeMeterPhoto(id: string) {
    setProperty((prev) => ({
      ...prev,
      meters: {
        ...prev.meters,
        [meterMode]: {
          ...prev.meters[meterMode],
          photos: prev.meters[meterMode].photos.filter((p) => p.id !== id),
        },
      },
    }))
  }

  function nextInspectionItem() {
    const areaIndex = AREAS.findIndex((a) => a.name === areaName)
    const itemIndex = AREAS[areaIndex].items.findIndex((i) => i === itemName)
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
    setProperty((prev) => ({
      ...prev,
      exports: [{ id: uid(), type: exportMode, token }, ...prev.exports],
    }))
    setScreen('shared')
  }

  const reportEntries = useMemo(() => {
    const source = exportMode === 'Move-out report' ? property.inspections.move_out : property.inspections.move_in
    return AREAS.map((area) => ({
      area: area.name,
      entries: area.items
        .map((itemKey) => ({ item: itemKey, ...source[area.name][itemKey] }))
        .filter((x) => x.status || x.notes || x.photos.length),
    })).filter((x) => x.entries.length)
  }, [exportMode, property])

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 p-3 md:p-6">
      <div className="mx-auto max-w-[440px]">
        <div className="min-h-[100dvh] overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-slate-200 md:min-h-[860px]">
          <TopBar
            title={
              screen === 'home'
                ? 'MoveProof'
                : screen === 'property'
                ? property.title
                : screen === 'inspection'
                ? sessionType === 'move_in'
                  ? 'Move-in inspection'
                  : 'Move-out inspection'
                : screen === 'item'
                ? itemName
                : screen === 'meters'
                ? 'Meters & handover'
                : screen === 'export'
                ? 'Export evidence pack'
                : 'Shared evidence pack'
            }
            subtitle={
              screen === 'home'
                ? '稳定预览版，已修正图片问题'
                : screen === 'property'
                ? property.address
                : screen === 'item'
                ? areaName
                : screen === 'meters'
                ? property.title
                : screen === 'export'
                ? property.title
                : exportMode
            }
            onBack={
              screen === 'home'
                ? null
                : () =>
                    setScreen(
                      screen === 'property'
                        ? 'home'
                        : screen === 'inspection'
                        ? 'property'
                        : screen === 'item'
                        ? 'inspection'
                        : screen === 'meters'
                        ? 'property'
                        : screen === 'export'
                        ? 'property'
                        : 'property'
                    )
            }
          />

          {screen === 'home' && (
            <div className="p-5 space-y-4">
              <div className="rounded-3xl bg-slate-900 p-5 text-white">
                <div className="text-sm text-slate-300">稳定预览版</div>
                <div className="mt-2 text-2xl font-semibold">MoveProof</div>
                <div className="mt-4 grid gap-3">
                  <button
                    className="rounded-2xl bg-white px-4 py-3 text-left font-medium text-slate-900"
                    onClick={() => setScreen('property')}
                  >
                    进入房屋详情
                  </button>
                  <button
                    className="rounded-2xl bg-white/10 px-4 py-3 text-left font-medium"
                    onClick={() => {
                      setSessionType('move_in')
                      setScreen('inspection')
                    }}
                  >
                    进入入住检查
                  </button>
                  <button
                    className="rounded-2xl bg-white/10 px-4 py-3 text-left font-medium"
                    onClick={() => {
                      setMeterMode('move_in')
                      setScreen('meters')
                    }}
                  >
                    进入表计页
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">快速建档</div>
                <div className="mt-3 grid gap-3">
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="房屋名称"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="地址"
                  />
                  <button
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                    onClick={() => {
                      setProperty(makeProperty(title || 'New Property', address || 'Unknown address'))
                      setScreen('property')
                    }}
                  >
                    创建新房屋
                  </button>
                </div>
              </div>
            </div>
          )}

          {screen === 'property' && (
            <div className="p-5 space-y-4">
              <div className="rounded-3xl bg-slate-900 p-5 text-white">
                <div className="text-sm text-slate-300">房屋信息</div>
                <div className="mt-2 text-2xl font-semibold">{property.title}</div>
                <div className="mt-1 text-sm text-slate-300">{property.address}</div>
              </div>
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                onClick={() => {
                  setSessionType('move_in')
                  setScreen('inspection')
                }}
              >
                入住检查
              </button>
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                onClick={() => {
                  setSessionType('move_out')
                  setScreen('inspection')
                }}
              >
                退租检查
              </button>
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                onClick={() => {
                  setMeterMode('move_in')
                  setScreen('meters')
                }}
              >
                表计与交接物
              </button>
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                onClick={() => setScreen('export')}
              >
                导出报告
              </button>
            </div>
          )}

          {screen === 'inspection' && (
            <div className="p-5 space-y-4">
              {AREAS.map((area) => (
                <div key={area.name} className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 font-semibold text-slate-900">{area.name}</div>
                  <div className="grid gap-2">
                    {area.items.map((name) => {
                      const rec = property.inspections[sessionType][area.name][name]
                      return (
                        <button
                          key={name}
                          className="flex items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-slate-50"
                          onClick={() => {
                            setAreaName(area.name)
                            setItemName(name)
                            setScreen('item')
                          }}
                        >
                          <div>
                            <div className="font-medium text-slate-800">{name}</div>
                            <div className="mt-1 text-xs text-slate-400">{rec.photos.length} image(s)</div>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badge(rec.status)}`}>
                            {statusText(rec.status)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {screen === 'item' && (
            <div className="p-5 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">检查项</div>
                <div className="mt-2 text-xl font-semibold text-slate-900">{itemName}</div>
                <div className="mt-1 text-sm text-slate-500">{areaName}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">状态</div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`rounded-2xl border px-3 py-3 text-sm font-medium ${
                        item.status === opt.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                      onClick={() => {
                        setProperty((prev) => ({
                          ...prev,
                          inspections: {
                            ...prev.inspections,
                            [sessionType]: {
                              ...prev.inspections[sessionType],
                              [areaName]: {
                                ...prev.inspections[sessionType][areaName],
                                [itemName]: {
                                  ...prev.inspections[sessionType][areaName][itemName],
                                  status: opt.value,
                                },
                              },
                            },
                          },
                        }))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">图片</div>
                <div className="mt-1 text-sm text-slate-500">这里已修正为：相册 / 相机 / 删除</div>
                <div className="mt-3">
                  <PhotoButtons
                    onLibraryFiles={addItemPhotos}
                    onCameraFiles={addItemPhotos}
                    onDemo={addDemoItemPhoto}
                  />
                </div>
                <div className="mt-3">
                  <PhotoGrid photos={item.photos} onDelete={removeItemPhoto} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">备注</div>
                <textarea
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
                  rows={4}
                  value={item.notes}
                  onChange={(e) => {
                    const value = e.target.value
                    setProperty((prev) => ({
                      ...prev,
                      inspections: {
                        ...prev.inspections,
                        [sessionType]: {
                          ...prev.inspections[sessionType],
                          [areaName]: {
                            ...prev.inspections[sessionType][areaName],
                            [itemName]: {
                              ...prev.inspections[sessionType][areaName][itemName],
                              notes: value,
                            },
                          },
                        },
                      },
                    }))
                  }}
                  placeholder="输入问题描述"
                />
              </div>

              {sessionType === 'move_out' &&
              (moveInReference.status || moveInReference.notes || moveInReference.photos.length) ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-800">入住参考</div>
                  <div className="mt-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badge(moveInReference.status)}`}>
                      {statusText(moveInReference.status)}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-amber-900">{moveInReference.notes || '无备注'}</div>
                  <div className="mt-3">
                    <PhotoGrid photos={moveInReference.photos} onDelete={() => {}} />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => setScreen('inspection')}>保存</Button>
                <Button primary onClick={nextInspectionItem}>
                  保存并下一个
                </Button>
              </div>
            </div>
          )}

          {screen === 'meters' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1">
                <button
                  className={`rounded-[20px] px-3 py-3 text-sm font-medium ${
                    meterMode === 'move_in' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                  onClick={() => setMeterMode('move_in')}
                >
                  Move-in
                </button>
                <button
                  className={`rounded-[20px] px-3 py-3 text-sm font-medium ${
                    meterMode === 'move_out' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                  onClick={() => setMeterMode('move_out')}
                >
                  Move-out
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">表计读数</div>
                <div className="mt-3 grid gap-3">
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={meter.water}
                    onChange={(e) =>
                      setProperty((prev) => ({
                        ...prev,
                        meters: {
                          ...prev.meters,
                          [meterMode]: { ...prev.meters[meterMode], water: e.target.value },
                        },
                      }))
                    }
                    placeholder="Water"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={meter.electricity}
                    onChange={(e) =>
                      setProperty((prev) => ({
                        ...prev,
                        meters: {
                          ...prev.meters,
                          [meterMode]: { ...prev.meters[meterMode], electricity: e.target.value },
                        },
                      }))
                    }
                    placeholder="Electricity"
                  />
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={meter.gas}
                    onChange={(e) =>
                      setProperty((prev) => ({
                        ...prev,
                        meters: {
                          ...prev.meters,
                          [meterMode]: { ...prev.meters[meterMode], gas: e.target.value },
                        },
                      }))
                    }
                    placeholder="Gas"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">表计图片</div>
                <div className="mt-1 text-sm text-slate-500">这里也已修正为：相册 / 相机 / 删除</div>
                <div className="mt-3">
                  <PhotoButtons
                    onLibraryFiles={addMeterPhotos}
                    onCameraFiles={addMeterPhotos}
                    onDemo={addDemoMeterPhoto}
                  />
                </div>
                <div className="mt-3">
                  <PhotoGrid photos={meter.photos} onDelete={removeMeterPhoto} />
                </div>
              </div>

              <Button primary onClick={() => setScreen('property')}>
                保存并返回
              </Button>
            </div>
          )}

          {screen === 'export' && (
            <div className="p-5 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">导出内容</div>
                <div className="mt-3 grid gap-2">
                  {['Move-in report', 'Move-out report', 'Full comparison pack'].map((mode) => (
                    <button
                      key={mode}
                      className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium ${
                        exportMode === mode
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                      onClick={() => setExportMode(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <Button primary onClick={generateReport}>
                打开报告预览
              </Button>
              <Button onClick={() => exportJSON('moveproof-data.json', property)}>
                下载 JSON 数据
              </Button>
            </div>
          )}

          {screen === 'shared' && (
            <div className="p-5 space-y-4">
              <div className="rounded-3xl bg-slate-900 p-5 text-white">
                <div className="text-sm text-slate-300">Rental Evidence Pack</div>
                <div className="mt-2 text-2xl font-semibold">{property.title}</div>
                <div className="mt-1 text-sm text-slate-300">{property.address}</div>
                <div className="mt-3 text-xs text-slate-300">Token: {shareToken}</div>
              </div>
              {reportEntries.length ? (
                reportEntries.map((block) => (
                  <div key={block.area} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="font-semibold text-slate-900">{block.area}</div>
                    <div className="mt-3 grid gap-3">
                      {block.entries.map((entry) => (
                        <div key={entry.item} className="rounded-2xl bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium text-slate-900">{entry.item}</div>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badge(entry.status)}`}>
                              {statusText(entry.status)}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">{entry.notes || 'No note.'}</div>
                          {entry.photos.length ? (
                            <div className="mt-3">
                              <PhotoGrid photos={entry.photos} onDelete={() => {}} />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  当前报告还没有可展示的检查项。
                </div>
              )}
              <Button onClick={() => window.print()}>打印当前报告</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

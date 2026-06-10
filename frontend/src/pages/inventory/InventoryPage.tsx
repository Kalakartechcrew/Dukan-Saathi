import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus, Search, Package, Trash2, X, Upload, AlertCircle, CheckCircle2, FileSpreadsheet, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { analytics } from '@/lib/analytics'

interface ProductRow {
  id: string
  name: string
  sku: string
  quantity: number
  unit?: string
  buying_price: number
  selling_price: number
  profit_margin: number
  tax_rate?: number
  low_stock_threshold?: number
}

interface ImportRow {
  name: string
  selling_price: string
  buying_price: string
  quantity: string
  unit: string
  errors?: string[]
  is_valid?: boolean
}

const REQUIRED_HEADERS = ['Name', 'Selling price', 'Buying price', 'Quantity', 'Unit']

const UNIT_GROUPS = [
  {
    label: 'Count',
    units: [
      { value: 'piece', label: 'Piece' },
      { value: 'pack', label: 'Pack' },
      { value: 'box', label: 'Box' },
      { value: 'dozen', label: 'Dozen' },
      { value: 'pair', label: 'Pair' },
      { value: 'set', label: 'Set' },
      { value: 'bundle', label: 'Bundle' },
    ],
  },
  {
    label: 'Weight',
    units: [
      { value: 'kg', label: 'Kilogram' },
      { value: 'g', label: 'Gram' },
      { value: 'mg', label: 'Milligram' },
      { value: 'quintal', label: 'Quintal' },
      { value: 'ton', label: 'Ton' },
    ],
  },
  {
    label: 'Liquid',
    units: [
      { value: 'l', label: 'Liter' },
      { value: 'ml', label: 'Milliliter' },
      { value: 'bottle', label: 'Bottle' },
      { value: 'can', label: 'Can' },
      { value: 'jar', label: 'Jar' },
      { value: 'pouch', label: 'Pouch' },
      { value: 'sachet', label: 'Sachet' },
    ],
  },
  {
    label: 'Length & Area',
    units: [
      { value: 'm', label: 'Meter' },
      { value: 'cm', label: 'Centimeter' },
      { value: 'mm', label: 'Millimeter' },
      { value: 'ft', label: 'Foot' },
      { value: 'in', label: 'Inch' },
      { value: 'sqft', label: 'Square foot' },
      { value: 'sqm', label: 'Square meter' },
    ],
  },
  {
    label: 'Medical & Paper',
    units: [
      { value: 'strip', label: 'Strip' },
      { value: 'tablet', label: 'Tablet' },
      { value: 'roll', label: 'Roll' },
      { value: 'sheet', label: 'Sheet' },
      { value: 'ream', label: 'Ream' },
      { value: 'bag', label: 'Bag' },
    ],
  },
  {
    label: 'Service',
    units: [
      { value: 'hour', label: 'Hour' },
      { value: 'day', label: 'Day' },
      { value: 'service', label: 'Service' },
    ],
  },
]

const UNIT_LABELS = UNIT_GROUPS.flatMap((group) => group.units).reduce<Record<string, string>>((acc, unit) => {
  acc[unit.value] = unit.label
  return acc
}, {})

function UnitSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900/80"
      >
        {UNIT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.units.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

function formatStock(quantity: number, unit?: string) {
  const label = unit ? UNIT_LABELS[unit] || unit : 'Piece'
  return `${quantity} ${label}`
}

export function InventoryPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', selling_price: '', buying_price: '', quantity: '', unit: 'piece' })
  const [editing, setEditing] = useState<ProductRow | null>(null)
  
  // Import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => (await api.get('/products', { params: { search } })).data,
  })

  const createProduct = useMutation({
    mutationFn: () => api.post('/products', {
      name: form.name,
      selling_price: parseFloat(form.selling_price),
      buying_price: parseFloat(form.buying_price) || 0,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit,
    }),
    onSuccess: () => {
      toast.success('Product added')
      analytics.trackEvent('inventory_created', { name: form.name, price: parseFloat(form.selling_price) })
      setShowForm(false)
      setForm({ name: '', selling_price: '', buying_price: '', quantity: '', unit: 'piece' })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Failed to add product'),
  })

  const bulkCreate = useMutation({
    mutationFn: (rows: ImportRow[]) => api.post('/products/bulk', rows.map(r => ({
      name: r.name,
      selling_price: parseFloat(r.selling_price),
      buying_price: parseFloat(r.buying_price) || 0,
      quantity: parseFloat(r.quantity) || 0,
      unit: r.unit.toLowerCase(),
    }))),
    onSuccess: (res) => {
      toast.success(`${res.data.length} products imported`)
      analytics.trackEvent('inventory_created', { count: res.data.length, method: 'bulk_import' })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to import products'
      toast.error(msg)
    }
  })

  const updateProduct = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No product selected')
      return api.patch(`/products/${editing.id}`, {
        name: editing.name,
        quantity: Number(editing.quantity),
        buying_price: Number(editing.buying_price),
        selling_price: Number(editing.selling_price),
        unit: editing.unit || 'piece',
        tax_rate: Number(editing.tax_rate || 0),
        low_stock_threshold: Number(editing.low_stock_threshold || 5),
      })
    },
    onSuccess: () => {
      toast.success('Product updated')
      analytics.trackEvent('inventory_updated', { name: editing?.name })
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('Failed to update product'),
  })

  const deleteProduct = useMutation({
    mutationFn: (product: ProductRow) => api.delete(`/products/${product.id}`),
    onSuccess: () => {
      toast.success('Product deleted')
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => toast.error('Failed to delete product'),
  })

  const validateRows = (rows: Record<string, unknown>[]): ImportRow[] => {
    return rows.map(row => {
      const errors: string[] = []
      
      const name = String(row.Name || '').trim()
      if (!name) errors.push('Name is required')
      
      const sp = parseFloat(String(row['Selling price'] || '0'))
      if (isNaN(sp)) errors.push('Invalid Selling price')
      
      const bp = parseFloat(String(row['Buying price'] || '0'))
      if (isNaN(bp)) errors.push('Invalid Buying price')
      
      const qty = parseFloat(String(row['Quantity'] || '0'))
      if (isNaN(qty)) errors.push('Invalid Quantity')
      
      const unit = String(row['Unit'] || '').trim().toLowerCase()
      if (!unit || !UNIT_LABELS[unit]) errors.push('Unsupported Unit')

      return {
        name: name,
        selling_price: String(row['Selling price'] || ''),
        buying_price: String(row['Buying price'] || ''),
        quantity: String(row['Quantity'] || ''),
        unit: unit || '',
        errors,
        is_valid: errors.length === 0
      }
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingFile(true)
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(results.data, results.meta.fields || [])
        },
        error: () => {
          toast.error('Failed to parse CSV file')
          setIsProcessingFile(false)
        }
      })
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)
        const headers = data.length > 0 ? Object.keys(data[0] as object) : []
        processParsedData(data, headers)
      }
      reader.onerror = () => {
        toast.error('Failed to read Excel file')
        setIsProcessingFile(false)
      }
      reader.readAsBinaryString(file)
    } else {
      toast.error('Unsupported file format. Use CSV or Excel.')
      setIsProcessingFile(false)
    }
  }

  const processParsedData = (data: unknown[], headers: string[]) => {
    const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h))
    const extraHeaders = headers.filter(h => !REQUIRED_HEADERS.includes(h))

    if (missingHeaders.length > 0) {
      toast.error(`Missing columns: ${missingHeaders.join(', ')}`)
      setIsProcessingFile(false)
      return
    }

    if (extraHeaders.length > 0) {
      toast.error(`File contains extra columns: ${extraHeaders.join(', ')}. Only Name, Selling price, Buying price, Quantity, Unit are allowed.`)
      setIsProcessingFile(false)
      return
    }

    const validated = validateRows(data as Record<string, unknown>[])
    setImportRows(validated)
    setIsProcessingFile(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImportValid = async () => {
    const validRows = importRows.filter(r => r.is_valid)
    if (validRows.length === 0) return

    await bulkCreate.mutateAsync(validRows)
    
    // Keep only invalid rows for the user to fix
    setImportRows(prev => prev.filter(r => !r.is_valid))
  }

  const updateImportRow = (index: number, field: keyof ImportRow, value: string) => {
    setImportRows(prev => {
      const next = [...prev]
      const row = { ...next[index], [field]: value }
      
      // Re-validate this row
      const errors: string[] = []
      if (!row.name || row.name.trim() === '') errors.push('Name is required')
      if (isNaN(parseFloat(row.selling_price))) errors.push('Invalid Selling price')
      if (isNaN(parseFloat(row.buying_price))) errors.push('Invalid Buying price')
      if (isNaN(parseFloat(row.quantity))) errors.push('Invalid Quantity')
      const unit = row.unit.trim().toLowerCase()
      if (!unit || !UNIT_LABELS[unit]) errors.push('Unsupported Unit')
      
      row.errors = errors
      row.is_valid = errors.length === 0
      next[index] = row
      return next
    })
  }

  const removeImportRow = (index: number) => {
    setImportRows(prev => prev.filter((_, i) => i !== index))
  }

  const downloadTemplate = () => {
    const csv = Papa.unparse([REQUIRED_HEADERS.reduce((acc, h) => ({ ...acc, [h]: '' }), {})])
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importStats = useMemo(() => {
    const total = importRows.length
    const valid = importRows.filter(r => r.is_valid).length
    const invalid = total - valid
    return { total, valid, invalid }
  }, [importRows])

  const products: ProductRow[] = data?.items || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Inventory</h2>
          <p className="text-slate-500">Manage products & stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImportModal(true)} tooltip="Import products from a CSV or Excel file.">
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button onClick={() => setShowForm(!showForm)} tooltip="Show or hide the new product form.">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold">Import Inventory</h3>
              <Button variant="ghost" onClick={() => { setShowImportModal(false); setImportRows([]); }} tooltip="Close import wizard."><X className="h-4 w-4" /></Button>
            </div>

            {importRows.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 py-16 dark:border-slate-800">
                <FileSpreadsheet className="h-16 w-16 text-slate-300" />
                <p className="mt-4 text-center text-slate-500">
                  Upload a CSV or Excel file to bulk import products.<br />
                  Columns must be: <strong>{REQUIRED_HEADERS.join(', ')}</strong>
                </p>
                <div className="mt-8 flex gap-4">
                  <Button variant="secondary" onClick={downloadTemplate} tooltip="Download a sample CSV file with correct headers.">
                    <Download className="h-4 w-4" /> Download Template
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} loading={isProcessingFile} tooltip="Select a file from your computer.">
                    Select File
                  </Button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx,.xls" className="hidden" />
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="font-semibold text-emerald-700">{importStats.valid} Ready</span>
                    </div>
                    {importStats.invalid > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <span className="font-semibold text-amber-700">{importStats.invalid} Need Correction</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setImportRows([])} tooltip="Discard current file and upload a new one.">Reset</Button>
                    <Button 
                      onClick={handleImportValid} 
                      disabled={importStats.valid === 0} 
                      loading={bulkCreate.isPending}
                      tooltip="Save all valid products to inventory."
                    >
                      Import {importStats.valid} Valid Rows
                    </Button>
                  </div>
                </div>

                <div className="max-h-[500px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-slate-950">
                      <tr className="border-b text-left text-slate-500">
                        <th className="p-3">Status</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Sell Price</th>
                        <th className="p-3">Buy Price</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Unit</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, idx) => (
                        <tr key={idx} className={`border-b border-slate-100 dark:border-slate-800 ${row.is_valid ? '' : 'bg-amber-50/30'}`}>
                          <td className="p-3">
                            {row.is_valid ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <div className="group relative">
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                                <div className="absolute bottom-full left-0 mb-2 hidden w-48 rounded-lg bg-slate-900 p-2 text-xs text-white group-hover:block">
                                  {row.errors?.join(', ')}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-3 min-w-[150px]">
                            <input 
                              className="w-full bg-transparent focus:outline-none" 
                              value={row.name} 
                              onChange={(e) => updateImportRow(idx, 'name', e.target.value)}
                            />
                          </td>
                          <td className="p-3 w-24">
                            <input 
                              type="number"
                              className="w-full bg-transparent focus:outline-none" 
                              value={row.selling_price} 
                              onChange={(e) => updateImportRow(idx, 'selling_price', e.target.value)}
                            />
                          </td>
                          <td className="p-3 w-24">
                            <input 
                              type="number"
                              className="w-full bg-transparent focus:outline-none" 
                              value={row.buying_price} 
                              onChange={(e) => updateImportRow(idx, 'buying_price', e.target.value)}
                            />
                          </td>
                          <td className="p-3 w-24">
                            <input 
                              type="number"
                              step="0.01"
                              className="w-full bg-transparent focus:outline-none" 
                              value={row.quantity} 
                              onChange={(e) => updateImportRow(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="p-3 w-32">
                            <select 
                              className="w-full bg-transparent focus:outline-none" 
                              value={row.unit} 
                              onChange={(e) => updateImportRow(idx, 'unit', e.target.value)}
                            >
                              <option value="">Select Unit</option>
                              {UNIT_GROUPS.flatMap(g => g.units).map(u => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="ghost" onClick={() => removeImportRow(idx)} tooltip="Delete this row from import list.">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Selling price" type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
          <Input label="Buying price" type="number" value={form.buying_price} onChange={(e) => setForm({ ...form, buying_price: e.target.value })} />
          <Input label="Quantity" type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <UnitSelect label="Unit" value={form.unit} onChange={(unit) => setForm({ ...form, unit })} />
          <div className="flex items-end">
            <Button onClick={() => createProduct.mutate()} loading={createProduct.isPending} className="w-full" tooltip="Save this product to inventory and POS.">Save</Button>
          </div>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-xl border py-2.5 pl-10 pr-4 dark:border-slate-700 dark:bg-slate-900/80"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-3">Product</th>
                <th className="pb-3">SKU</th>
                <th className="pb-3">Stock</th>
                <th className="pb-3">Buy</th>
                <th className="pb-3">Sell</th>
                <th className="pb-3">Margin</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7}><Skeleton className="h-12" /></td></tr>
              ) : products.length ? (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-medium">{p.name}</td>
                    <td className="py-3 text-slate-500">{p.sku}</td>
                    <td className={`py-3 ${p.quantity <= (p.low_stock_threshold || 5) ? 'text-amber-600 font-medium' : ''}`}>{formatStock(p.quantity, p.unit)}</td>
                    <td className="py-3">{formatCurrency(p.buying_price)}</td>
                    <td className="py-3">{formatCurrency(p.selling_price)}</td>
                    <td className="py-3">{p.profit_margin?.toFixed(1)}%</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)} tooltip="Edit this product's price, stock, and tax details.">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          tooltip="Delete this product from inventory and hide it from POS."
                          onClick={() => {
                            if (window.confirm(`Delete ${p.name}? It will be hidden from inventory and POS.`)) {
                              deleteProduct.mutate(p)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    No products yet. Add your first product.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Edit Product</h3>
                <p className="text-sm text-slate-500">{editing.sku}</p>
              </div>
              <Button variant="ghost" onClick={() => setEditing(null)} tooltip="Close the product editor."><X className="h-4 w-4" /></Button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Input label="Current stock" type="number" step="0.01" value={String(editing.quantity)} onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value || 0) })} />
              <UnitSelect label="Unit" value={editing.unit || 'piece'} onChange={(unit) => setEditing({ ...editing, unit })} />
              <Input label="Buying price" type="number" value={String(editing.buying_price)} onChange={(e) => setEditing({ ...editing, buying_price: Number(e.target.value || 0) })} />
              <Input label="Selling price" type="number" value={String(editing.selling_price)} onChange={(e) => setEditing({ ...editing, selling_price: Number(e.target.value || 0) })} />
              <Input label="Tax %" type="number" value={String(editing.tax_rate || 0)} onChange={(e) => setEditing({ ...editing, tax_rate: Number(e.target.value || 0) })} />
              <Input label="Low stock alert" type="number" value={String(editing.low_stock_threshold || 5)} onChange={(e) => setEditing({ ...editing, low_stock_threshold: Number(e.target.value || 0) })} />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditing(null)} tooltip="Discard product changes.">Cancel</Button>
              <Button loading={updateProduct.isPending} onClick={() => updateProduct.mutate()} tooltip="Update this product in inventory and POS.">Save changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

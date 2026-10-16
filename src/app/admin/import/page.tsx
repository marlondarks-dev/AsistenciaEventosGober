"use client"

import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResults(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (res.ok) {
        setResults(data.results)
      } else {
        setError(data.error || 'Error desconocido')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '1.5rem' }}>Importar Base de Datos PILI</h1>
      
      <div className="card max-w-2xl">
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Seleccione un archivo Excel (.xlsx) con el formato PILI (Caracterización de la Población Atendida). 
          El sistema detectará automáticamente los encabezados e importará los registros.
        </p>

        <div 
          style={{ 
            border: '2px dashed var(--border)', 
            borderRadius: 'var(--radius)', 
            padding: '2rem', 
            textAlign: 'center',
            marginBottom: '1.5rem',
            backgroundColor: file ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
          }}
        >
          <FileSpreadsheet size={48} color={file ? 'var(--secondary)' : 'var(--text-muted)'} style={{ margin: '0 auto 1rem' }} />
          {file ? (
            <div>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{file.name}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Arrastre el archivo aquí o haga clic para seleccionar</p>
            </div>
          )}
          
          <input 
            type="file" 
            accept=".xlsx,.xls,.csv" 
            onChange={handleFileChange} 
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="btn btn-outline" style={{ marginTop: '1rem' }}>
            Seleccionar Archivo
          </label>
        </div>

        <button 
          className="btn btn-primary w-full" 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          style={{ padding: '0.75rem', fontSize: '1rem' }}
        >
          {isUploading ? 'Procesando...' : 'Iniciar Importación'}
          {!isUploading && <Upload size={18} style={{ marginLeft: '0.5rem' }} />}
        </button>

        {error && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {results && (
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'rgba(34, 197, 94, 0.05)', border: '1px solid var(--success)', borderRadius: 'var(--radius)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600, marginBottom: '1rem' }}>
              <CheckCircle size={24} />
              Importación Exitosa
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Total de registros procesados:</strong> {results.total}</li>
              <li><strong>Nuevos participantes agregados:</strong> {results.imported}</li>
              <li><strong>Registros existentes actualizados:</strong> {results.updated}</li>
              <li style={{ color: results.errors > 0 ? 'var(--warning)' : 'inherit' }}>
                <strong>Registros omitidos/con error:</strong> {results.errors}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

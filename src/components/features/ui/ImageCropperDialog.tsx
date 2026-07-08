'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import getCroppedImg from '@/lib/utils/cropImage'

interface ImageCropperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageFile: File | null
  onCropSubmit: (croppedFile: File) => void
  onCancel: () => void
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageFile,
  onCropSubmit,
  onCancel,
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number
    height: number
    x: number
    y: number
  } | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  const onCropComplete = useCallback(
    (
      _croppedArea: { width: number; height: number; x: number; y: number },
      croppedAreaPixels: {
        width: number
        height: number
        x: number
        y: number
      },
    ) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    [],
  )

  const handleCrop = async () => {
    if (!imageFile || !croppedAreaPixels) return

    setIsCropping(true)
    try {
      const imageUrl = URL.createObjectURL(imageFile)
      const croppedFile = await getCroppedImg(imageUrl, croppedAreaPixels, 640)
      if (croppedFile) {
        onCropSubmit(croppedFile)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsCropping(false)
    }
  }

  // Create an object URL only when an imageFile is present
  const imageSrc = imageFile ? URL.createObjectURL(imageFile) : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Recortar Foto de Perfil</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[400px] bg-black rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <label className="text-sm font-medium">Zoom</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            className="w-full"
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isCropping}>
            Cancelar
          </Button>
          <Button onClick={handleCrop} disabled={isCropping}>
            {isCropping ? 'Recortando...' : 'Aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

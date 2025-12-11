import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, QrCode } from 'lucide-react';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  const startScanner = async () => {
    try {
      setError(null);
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {} // Ignore errors during scanning
      );
      
      setIsScanning(true);
    } catch (err) {
      setError('No se pudo acceder a la cámara. Por favor, permite el acceso.');
      console.error('Error starting scanner:', err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Escanear Ticket
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          id={containerId} 
          className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
        />
        
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        
        <div className="flex gap-2">
          {!isScanning ? (
            <Button onClick={startScanner} className="flex-1 touch-target">
              <Camera className="h-5 w-5 mr-2" />
              Iniciar Cámara
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="secondary" className="flex-1 touch-target">
              Detener
            </Button>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          Apunta la cámara al código QR del ticket
        </p>
      </CardContent>
    </Card>
  );
}

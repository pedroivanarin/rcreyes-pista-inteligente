import { QRCodeSVG } from 'qrcode.react';
import { Ticket } from '@/types/database';

interface PrintableTicketProps {
  ticket: Ticket;
  personNumber?: number;
  totalPersons: number;
  isGroupTicket?: boolean;
}

export function PrintableTicket({ ticket, personNumber, totalPersons, isGroupTicket = false }: PrintableTicketProps) {
  const entryTime = new Date(ticket.hora_entrada).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="print-ticket">
      <div className="print-ticket-header">
        <h1>RC REYES</h1>
        <p className="print-ticket-code">{ticket.codigo}</p>
      </div>
      
      <div className="print-ticket-qr">
        <QRCodeSVG
          value={`RCREYES:${ticket.codigo}`}
          size={100}
          level="M"
        />
      </div>
      
      <div className="print-ticket-info">
        <p><strong>Cliente:</strong> {ticket.cliente?.nombre}</p>
        <p><strong>Entrada:</strong> {entryTime}</p>
        {isGroupTicket ? (
          <p className="print-ticket-person">
            {totalPersons} persona{totalPersons > 1 ? 's' : ''}
          </p>
        ) : (
          <p className="print-ticket-person">
            Persona {personNumber} de {totalPersons}
          </p>
        )}
      </div>
      
      <div className="print-ticket-footer">
        <p>Escanea el QR para salir</p>
      </div>
    </div>
  );
}

interface PrintableTicketsContainerProps {
  ticket: Ticket;
  onClose: () => void;
}

export function PrintableTicketsContainer({ ticket, onClose }: PrintableTicketsContainerProps) {
  const handlePrint = () => {
    window.print();
  };

  const isGroupTicket = !ticket.imprimir_individual;
  const tickets = isGroupTicket 
    ? [1] // Single group ticket
    : Array.from({ length: ticket.personas }, (_, i) => i + 1); // Individual tickets

  return (
    <div className="print-container">
      {/* Print controls - hidden when printing */}
      <div className="print-controls no-print">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            {isGroupTicket 
              ? `1 ticket grupal (${ticket.personas} personas)` 
              : `${ticket.personas} ticket${ticket.personas > 1 ? 's' : ''} individual${ticket.personas > 1 ? 'es' : ''}`
            }
          </p>
        </div>
        <button onClick={handlePrint} className="print-btn">
          Imprimir {isGroupTicket ? '1 ticket' : `${ticket.personas} ticket${ticket.personas > 1 ? 's' : ''}`}
        </button>
        <button onClick={onClose} className="print-btn-secondary">
          Cerrar
        </button>
      </div>

      {/* Tickets to print */}
      <div className="print-tickets-grid">
        {tickets.map((num) => (
          <PrintableTicket
            key={num}
            ticket={ticket}
            personNumber={isGroupTicket ? undefined : num}
            totalPersons={ticket.personas}
            isGroupTicket={isGroupTicket}
          />
        ))}
      </div>

      <style>{`
        .print-container {
          padding: 20px;
          background: white;
          min-height: 100vh;
        }
        
        .print-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          justify-content: center;
        }
        
        .print-btn {
          padding: 12px 24px;
          background: #e31837;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          font-weight: 600;
        }
        
        .print-btn:hover {
          background: #c41530;
        }
        
        .print-btn-secondary {
          padding: 12px 24px;
          background: #666;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        }
        
        .print-tickets-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
        }
        
        .print-ticket {
          width: 58mm;
          padding: 8px;
          border: 1px dashed #ccc;
          background: white;
          text-align: center;
          font-family: 'Arial', sans-serif;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .print-ticket-header h1 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 2px;
        }
        
        .print-ticket-code {
          font-size: 18px;
          font-weight: bold;
          margin: 4px 0;
          font-family: monospace;
        }
        
        .print-ticket-qr {
          margin: 8px 0;
          display: flex;
          justify-content: center;
        }
        
        .print-ticket-info {
          font-size: 11px;
          text-align: left;
          margin: 8px 0;
          line-height: 1.4;
        }
        
        .print-ticket-info p {
          margin: 2px 0;
        }
        
        .print-ticket-person {
          text-align: center;
          font-size: 12px;
          font-weight: bold;
          margin-top: 6px !important;
          padding: 4px;
          background: #f0f0f0;
          border-radius: 4px;
        }
        
        .print-ticket-footer {
          font-size: 10px;
          color: #666;
          border-top: 1px dashed #ccc;
          padding-top: 6px;
          margin-top: 8px;
        }
        
        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-container {
            padding: 0;
            background: white;
          }
          
          .print-tickets-grid {
            display: block;
          }
          
          .print-ticket {
            width: 58mm;
            border: none;
            margin: 0 auto;
            padding: 4mm;
            page-break-after: always;
          }
          
          .print-ticket:last-child {
            page-break-after: avoid;
          }
        }
      `}</style>
    </div>
  );
}

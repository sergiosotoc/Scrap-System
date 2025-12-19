<?php
/* app\Mail\ReporteScrapMail.php */
namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class ReporteScrapMail extends Mailable
{
    use Queueable, SerializesModels;

    public $fecha;
    public $turno;
    public $operadorName;
    protected $excelFilePath;
    protected $fileName;

    /**
     * Create a new message instance.
     */
    public function __construct($fecha, $turno, $operadorName, $excelFilePath, $fileName)
    {
        $this->fecha = $fecha;
        $this->turno = $turno;
        $this->operadorName = $operadorName;
        $this->excelFilePath = $excelFilePath;
        $this->fileName = $fileName;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reporte de Scrap - ' . $this->fecha . ' - Turno ' . $this->turno,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.reporte_scrap', // Crearemos esta vista a continuación
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [
            Attachment::fromPath($this->excelFilePath)
                ->as($this->fileName)
                ->withMime('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        ];
    }
}
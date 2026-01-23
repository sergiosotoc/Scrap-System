<?php
/* app\Mail\ReporteScrapMail.php */
namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Queue\SerializesModels;

class ReporteScrapMail extends Mailable
{
    use Queueable, SerializesModels;

    public $asuntoPersonalizado;
    public $operadorName;
    protected $excelFilePath;
    protected $fileName;

    /**
     * Create a new message instance.
     * Constructor actualizado (parámetros simplificados)
     */
    public function __construct($asunto, $operadorName, $excelFilePath, $fileName)
    {
        $this->asuntoPersonalizado = $asunto;
        $this->operadorName = strtoupper($operadorName);
        $this->excelFilePath = $excelFilePath;
        $this->fileName = $fileName;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(
                env('MAIL_FROM_ADDRESS', 'scrap.cofmx@coficab.com'), 
                env('MAIL_FROM_NAME', 'Scrap')
            ),
            subject: $this->asuntoPersonalizado,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.reporte_scrap',
            with: [
                'operadorName' => $this->operadorName,
                'fechaHora' => now()->format('d/m/Y H:i:s'),
                'asunto' => $this->asuntoPersonalizado,
            ],
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
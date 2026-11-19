import { Phone, MessageCircle, Mail } from "lucide-react";
import { linkWhatsApp } from "@/lib/whatsapp";
import { formatarTelefone } from "@/lib/format/telefone";
import { Button } from "@/components/ui/button";

/** Botões de ligar / WhatsApp / e-mail. */
export function ContatoRapido({
  telefone,
  whatsapp,
  email,
  mensagem,
  compacto,
}: {
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  mensagem?: string;
  compacto?: boolean;
}) {
  const wa = linkWhatsApp(whatsapp || telefone, mensagem);
  const tel = telefone || whatsapp;
  if (!wa && !tel && !email) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {wa && (
        <Button asChild variant="whatsapp" size={compacto ? "icon-sm" : "sm"}>
          <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <MessageCircle />
            {!compacto && "WhatsApp"}
          </a>
        </Button>
      )}
      {tel && (
        <Button asChild variant="outline" size={compacto ? "icon-sm" : "sm"}>
          <a href={`tel:+55${tel}`} aria-label={`Ligar para ${formatarTelefone(tel)}`}>
            <Phone />
            {!compacto && formatarTelefone(tel)}
          </a>
        </Button>
      )}
      {email && !compacto && (
        <Button asChild variant="outline" size="sm">
          <a href={`mailto:${email}`}><Mail /> E-mail</a>
        </Button>
      )}
    </div>
  );
}

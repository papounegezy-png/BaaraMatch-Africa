import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Facebook, Linkedin, Link2, Share2 } from "lucide-react";
import { WhatsAppIcon, MessengerIcon, XIcon } from "@/components/share-icons";
import { openPlatformShare, copyJobLink, type SharePlatform } from "@/lib/share-job";
import { useToast } from "@/hooks/use-toast";

const platforms: { id: SharePlatform; label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string }[] = [
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon, colorClass: "text-[#25D366]" },
  { id: "facebook", label: "Facebook", icon: Facebook, colorClass: "text-[#1877F2]" },
  { id: "messenger", label: "Messenger", icon: MessengerIcon, colorClass: "text-[#0084FF]" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, colorClass: "text-[#0A66C2]" },
  { id: "x", label: "X", icon: XIcon, colorClass: "text-foreground" },
];

export function ShareJobMenu({
  job,
  url,
  testIdPrefix = "share",
}: {
  job: { title: string; organizationName?: string | null };
  url: string;
  testIdPrefix?: string;
}) {
  const { toast } = useToast();

  const handleCopy = async () => {
    const copied = await copyJobLink(url);
    if (copied) {
      toast({ title: "Lien copié", description: "Le lien de l'offre a été copié dans le presse-papiers." });
    } else {
      toast({ title: "Erreur", description: "Impossible de copier le lien.", variant: "destructive" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Partager cette offre"
          data-testid={`button-${testIdPrefix}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {platforms.map((platform) => (
          <DropdownMenuItem
            key={platform.id}
            onClick={() => openPlatformShare(platform.id, job, url)}
            data-testid={`${testIdPrefix}-${platform.id}`}
          >
            <platform.icon className={`h-4 w-4 mr-2 ${platform.colorClass}`} />
            {platform.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={handleCopy} data-testid={`${testIdPrefix}-copy-link`}>
          <Link2 className="h-4 w-4 mr-2" />
          Copier le lien
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

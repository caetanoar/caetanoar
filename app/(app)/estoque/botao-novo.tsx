"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function BotaoNovoVeiculo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm"><Plus /> Novo</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild><Link href="/estoque/novo?tipo=proprio">Carro próprio</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/estoque/novo?tipo=consignado">Carro consignado</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

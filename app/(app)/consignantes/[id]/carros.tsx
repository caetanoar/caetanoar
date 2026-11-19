/** Carros deixados por este consignante (preenchido no módulo de estoque consignado). */
export async function CarrosDoConsignante({ id }: { id: string }) {
  void id;
  return <p className="text-sm text-muted-foreground">Nenhum carro consignado ainda.</p>;
}

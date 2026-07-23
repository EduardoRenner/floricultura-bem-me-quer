import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  CalendarDays,
  Clock,
  Flower2,
  ImageUp,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  adminDeleteOrder,
  adminDeleteProduct,
  adminListOrders,
  adminListProducts,
  adminListSettings,
  adminLogin,
  adminStats,
  adminUpdateOrderStatus,
  adminUpdateSetting,
  adminUploadProductImage,
  adminUpsertProduct,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/shop";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const STORAGE_KEY = "bmq-admin-pass";
const STATUSES = ["pendente", "em_preparo", "saiu_entrega", "entregue", "cancelado"];
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_preparo: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-900",
  em_preparo: "bg-blue-100 text-blue-900",
  saiu_entrega: "bg-purple-100 text-purple-900",
  entregue: "bg-green-100 text-green-900",
  cancelado: "bg-red-100 text-red-900",
};

type Tab = "dashboard" | "orders" | "products" | "settings";

function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setPassword(saved);
  }, []);

  if (!password) return <LoginCard onLogin={setPassword} />;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-4 md:block">
          <div className="mb-6 flex items-center gap-3">
            <img
              src="/logo-bmq.png"
              alt="Bem Me Quer"
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
            <div>
              <div className="font-display text-accent">Bem Me Quer</div>
              <div className="text-xs text-muted-foreground">Painel admin</div>
            </div>
          </div>
          <nav className="space-y-1">
            {(
              [
                { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { id: "orders", label: "Pedidos", icon: ShoppingBag },
                { id: "products", label: "Produtos", icon: Flower2 },
                { id: "settings", label: "Configurações", icon: SettingsIcon },
              ] as { id: Tab; label: string; icon: typeof LayoutDashboard }[]
            ).map((it) => (
              <button
                key={it.id}
                onClick={() => setTab(it.id)}
                className={
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition " +
                  (tab === it.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")
                }
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </button>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            className="mt-6 w-full justify-start text-muted-foreground"
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              setPassword(null);
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </aside>

        <main className="flex-1 p-6">
          <div className="mb-6 flex flex-wrap items-center gap-2 md:hidden">
            {(["dashboard", "orders", "products", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  "rounded-full border px-3 py-1 text-xs " +
                  (tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border")
                }
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "dashboard" && <DashboardTab password={password} />}
          {tab === "orders" && <OrdersTab password={password} />}
          {tab === "products" && <ProductsTab password={password} />}
          {tab === "settings" && <SettingsTab password={password} />}
        </main>
      </div>
    </div>
  );
}

function LoginCard({ onLogin }: { onLogin: (p: string) => void }) {
  const [value, setValue] = useState("");
  const login = useServerFn(adminLogin);
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/30 p-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (value.length < 6) {
            toast.error("Senha muito curta.");
            return;
          }
          setLoading(true);
          try {
            await login({ data: { password: value } });
            sessionStorage.setItem(STORAGE_KEY, value);
            onLogin(value);
            toast.success("Bem-vindo(a)!");
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Erro";
            toast.error(msg);
          } finally {
            setLoading(false);
          }
        }}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-8 shadow-lg"
      >
        <div className="text-center">
          <img
            src="/logo-bmq.png"
            alt="Bem Me Quer"
            width={88}
            height={88}
            className="mx-auto h-22 w-22 rounded-full object-cover"
          />
          <h1 className="mt-3 font-display text-2xl">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">Floricultura Bem Me Quer</p>
        </div>
        <div>
          <Label>Senha</Label>
          <Input
            type="password"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>
        <Button className="w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

function DashboardTab({ password }: { password: string }) {
  const stats = useServerFn(adminStats);
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => stats({ data: { password } }),
  });
  return <ReportsDashboard live={data} />;
}


type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: string;
  total: number;
  status: string;
  created_at: string;
  items: { name: string; quantity: number }[];
  notes: string | null;
  payment_method: string;
  delivery_address: Record<string, string> | null;
};

function OrdersTab({ password }: { password: string }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListOrders);
  const update = useServerFn(adminUpdateOrderStatus);
  const del = useServerFn(adminDeleteOrder);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await list({ data: { password } })) as unknown as Order[],
  });

  const mutation = useMutation({
    mutationFn: (v: { id: string; status: string }) =>
      update({ data: { password, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status atualizado");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { password, id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setExpanded(null);
      toast.success("Pedido excluído");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const filtered = (orders ?? []).filter((o) => (filter === "all" ? true : o.status === filter));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os pedidos recebidos</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 hidden md:table-cell">Entrega</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden lg:table-cell">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum pedido.
                </td>
              </tr>
            )}
            {filtered.map((o) => (
              <>
                <tr
                  key={o.id}
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="cursor-pointer border-t border-border hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {o.delivery_type === "delivery" ? "Entrega" : "Retirada"}
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatBRL(Number(o.total))}</td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_COLOR[o.status] || "bg-muted"}>
                      {STATUS_LABEL[o.status] || o.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
                {expanded === o.id && (
                  <tr className="bg-muted/20">
                    <td colSpan={6} className="p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="mb-2 font-semibold">Itens</h4>
                          <ul className="space-y-1 text-sm">
                            {o.items?.map((it, i) => (
                              <li key={i}>
                                {it.quantity}× {it.name}
                              </li>
                            ))}
                          </ul>
                          {o.notes && (
                            <>
                              <h4 className="mt-3 mb-1 font-semibold">Observações</h4>
                              <p className="text-sm text-muted-foreground">{o.notes}</p>
                            </>
                          )}
                        </div>
                        <div>
                          <h4 className="mb-2 font-semibold">Detalhes</h4>
                          <p className="text-sm">Pagamento: {o.payment_method}</p>
                          {o.delivery_address && (
                            <p className="text-sm text-muted-foreground">
                              {String(o.delivery_address.rua ?? "")}, {String(o.delivery_address.numero ?? "")} -{" "}
                              {String(o.delivery_address.bairro ?? "")}
                            </p>
                          )}
                          <div className="mt-3">
                            <Label>Atualizar status</Label>
                            <Select
                              value={o.status}
                              onValueChange={(v) => mutation.mutate({ id: o.id, status: v })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {STATUS_LABEL[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="mt-4 border-t border-border/60 pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              disabled={remove.isPending}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Excluir o pedido ${o.order_number}? Esta ação não pode ser desfeita.`,
                                  )
                                ) {
                                  remove.mutate(o.id);
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {remove.isPending ? "Excluindo…" : "Excluir pedido"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  active: boolean;
};

function ProductsTab({ password }: { password: string }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListProducts);
  const upsert = useServerFn(adminUpsertProduct);
  const del = useServerFn(adminDeleteProduct);
  const uploadImage = useServerFn(adminUploadProductImage);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
      reader.readAsDataURL(file);
    });

  const handleImageFile = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadImage({
        data: {
          password,
          fileName: file.name,
          contentType: file.type,
          base64,
        },
      });
      setEditing((prev) => (prev ? { ...prev, image_url: result.url } : prev));
      toast.success("Imagem enviada!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => list({ data: { password } }) as Promise<AdminProduct[]>,
  });

  const save = useMutation({
    mutationFn: (p: AdminProduct) =>
      upsert({
        data: {
          password,
          product: {
            id: p.id || undefined,
            name: p.name,
            description: p.description,
            price: Number(p.price),
            category: p.category,
            image_url: p.image_url,
            active: p.active,
          },
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditing(null);
      toast.success("Produto salvo");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { password, id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto removido");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seu catálogo</p>
        </div>
        <Button
          onClick={() => {
            setEditing({
              id: "",
              name: "",
              description: "",
              price: 0,
              category: "Arranjos",
              image_url: "",
              active: true,
            });
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Adicionar Produto
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3 hidden md:table-cell">Categoria</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Ativo</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">
                      {p.image_url && (
                        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="font-medium">{p.name}</div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">{p.category}</td>
                <td className="px-4 py-3">{formatBRL(Number(p.price))}</td>
                <td className="px-4 py-3">
                  <Switch
                    checked={p.active}
                    onCheckedChange={(v) => save.mutate({ ...p, active: v })}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Remover este produto?")) remove.mutate(p.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(editing);
              }}
              className="space-y-3"
            >
              <div>
                <Label>Nome</Label>
                <Input
                  required
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço (R$)</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={editing.price}
                    onChange={(e) =>
                      setEditing({ ...editing, price: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select
                    value={editing.category}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Rosas", "Arranjos", "Presentes", "Plantas", "Outros"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Imagem do produto</Label>
                <div className="flex items-center gap-3">
                  {editing.image_url && (
                    <img
                      src={editing.image_url}
                      alt="Preview"
                      className="h-16 w-16 rounded-md object-cover border"
                    />
                  )}
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFile(file);
                        e.target.value = "";
                      }}
                    />
                    <span className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                        </>
                      ) : (
                        <>
                          <ImageUp className="h-4 w-4" /> Escolher imagem do celular/computador
                        </>
                      )}
                    </span>
                  </label>
                </div>
                <Input
                  value={editing.image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="ou cole uma URL manualmente"
                  className="mt-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.active}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                />
                <Label>Ativo</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsTab({ password }: { password: string }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListSettings);
  const update = useServerFn(adminUpdateSetting);

  const { data: rows } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () =>
      list({ data: { password } }) as Promise<
        { key: string; value: unknown }[]
      >,
  });

  const map = new Map((rows ?? []).map((r) => [r.key, r.value]));
  const [fee, setFee] = useState<string>("");
  const [min, setMin] = useState<string>("");
  const [override, setOverride] = useState<string>("auto");

  useEffect(() => {
    if (!rows) return;
    setFee(String(map.get("delivery_fee") ?? ""));
    setMin(String(map.get("minimum_order") ?? ""));
    const o = map.get("shop_open_override");
    setOverride(o === true ? "open" : o === false ? "closed" : "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const save = useMutation({
    mutationFn: (v: { key: string; value: unknown }) =>
      update({ data: { password, key: v.key, value: v.value } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
      toast.success("Configuração salva");
    },
  });

  if (!rows) return <div className="p-6 text-muted-foreground">Carregando configurações…</div>;

  return (
    <div>
      <h1 className="font-display text-3xl">Configurações</h1>
      <p className="text-sm text-muted-foreground">Ajuste a operação da loja</p>
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <Label>Taxa de entrega (R$)</Label>
          <div className="mt-2 flex gap-2">
            <Input value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.01" />
            <Button onClick={() => save.mutate({ key: "delivery_fee", value: Number(fee) })}>
              Salvar
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <Label>Valor mínimo do pedido (R$)</Label>
          <div className="mt-2 flex gap-2">
            <Input value={min} onChange={(e) => setMin(e.target.value)} type="number" step="0.01" />
            <Button onClick={() => save.mutate({ key: "minimum_order", value: Number(min) })}>
              Salvar
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <Label>Status da loja</Label>
          <div className="mt-2 flex gap-2">
            <Select value={override} onValueChange={setOverride}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (seguir horários)</SelectItem>
                <SelectItem value="open">Forçar aberta</SelectItem>
                <SelectItem value="closed">Forçar fechada</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() =>
                save.mutate({
                  key: "shop_open_override",
                  value: override === "auto" ? null : override === "open",
                })
              }
            >
              Salvar
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <Label>Horários de funcionamento</Label>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <div>Seg a Sex: 08:00–11:30 / 13:00–18:30</div>
            <div>Sábado: 08:00–12:00</div>
            <div>Domingo: Fechado</div>
            <p className="mt-2 text-xs">
              Para alterar os horários, entre em contato com o suporte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Reports Dashboard (Feature 10) ============
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

// Métricas reais vindas de adminStats (server function).
type AdminStats = {
  todayCount: number;
  pendingCount: number;
  activeProducts: number;
  monthRevenue: number;
  weekdayRevenue: number[]; // Seg..Dom
  monthlyRevenue: number[]; // Jan..Dez
  topProducts: { name: string; value: number }[];
  statusCounts: Record<string, number>;
  totalOrdersYear: number;
  ticketMedio: number;
  produtoCampeao: string | null;
  melhorMes: string | null;
  horarioPico: string | null;
  hasData: boolean;
};

// Rótulos + cores dos status para o gráfico de pizza (dados reais)
const STATUS_META: { key: string; name: string; color: string }[] = [
  { key: "entregue", name: "Entregue", color: "#4CAF50" },
  { key: "saiu_entrega", name: "Saiu p/ entrega", color: "#7E57C2" },
  { key: "em_preparo", name: "Em preparo", color: "#2196F3" },
  { key: "pendente", name: "Pendente", color: "#FFC107" },
  { key: "cancelado", name: "Cancelado", color: "#F44336" },
];

// Overlay mostrado quando um gráfico não tem dados ainda
function NoData() {
  return (
    <div className="grid h-[260px] place-items-center text-center">
      <div className="flex flex-col items-center">
        <Inbox className="h-7 w-7" strokeWidth={1.5} style={{ color: "#A5A17E" }} />
        <p className="mt-2 text-sm" style={{ color: "#A5A17E" }}>
          Sem dados ainda
        </p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "#222D17",
        border: "1px solid #CBB275",
        borderRadius: 8,
        padding: "8px 12px",
        color: "#F0EDD8",
        fontSize: "0.85rem",
      }}
    >
      {label && <div style={{ color: "#CBB275", fontWeight: 600 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i}>
          {suffix === "R$"
            ? formatBRL(Number(p.value))
            : `${p.value}${suffix ? " " + suffix : ""}`}
        </div>
      ))}
    </div>
  );
}

function ReportsDashboard({ live }: { live?: AdminStats }) {
  const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  // Enquanto carrega (server function ainda não respondeu)
  if (!live) {
    return (
      <div>
        <h1 className="font-display text-3xl" style={{ color: "#CBB275" }}>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Carregando relatórios…</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg" style={{ background: "#222D17" }} />
          ))}
        </div>
      </div>
    );
  }

  const weeklyData = WEEKDAYS.map((d, i) => ({ day: d, total: live.weekdayRevenue[i] ?? 0 }));
  const monthlyData = MONTHS.map((m, i) => ({ month: m, total: live.monthlyRevenue[i] ?? 0 }));
  const statusData = STATUS_META.map((m) => ({
    name: m.name,
    value: live.statusCounts[m.key] ?? 0,
    color: m.color,
  })).filter((s) => s.value > 0);
  const topProducts = live.topProducts ?? [];

  const hasWeekly = weeklyData.some((d) => d.total > 0);
  const hasMonthly = monthlyData.some((d) => d.total > 0);
  const hasStatus = statusData.length > 0;
  const hasTop = topProducts.length > 0;
  // Índice do dia da semana com maior faturamento (para destacar no gráfico)
  const bestWeekdayIdx = weeklyData.reduce(
    (best, d, i, arr) => (d.total > arr[best].total ? i : best),
    0,
  );

  const statCards = [
    { icon: Package, label: "Pedidos hoje", value: live.todayCount },
    { icon: Clock, label: "Pedidos pendentes", value: live.pendingCount },
    { icon: Wallet, label: "Faturamento este mês", value: formatBRL(live.monthRevenue) },
    { icon: Flower2, label: "Produtos ativos", value: live.activeProducts },
  ];

  const summary = [
    { icon: TrendingUp, label: "Ticket médio", value: live.hasData ? formatBRL(live.ticketMedio) : "—" },
    { icon: Award, label: "Produto campeão", value: live.produtoCampeao ?? "—" },
    { icon: Clock, label: "Horário de pico", value: live.horarioPico ?? "—" },
    { icon: CalendarDays, label: "Melhor mês", value: live.melhorMes ?? "—" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl" style={{ color: "#CBB275" }}>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Relatórios e visão geral · dados reais</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-5"
            style={{
              background: "#222D17",
              borderLeft: "4px solid #CBB275",
              boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            }}
          >
            <s.icon className="h-6 w-6" strokeWidth={1.5} style={{ color: "#CBB275" }} />
            <div className="mt-2 text-xs" style={{ color: "#A5A17E" }}>
              {s.label}
            </div>
            <div className="mt-1 font-display text-2xl" style={{ color: "#F0EDD8" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Vendas por dia da semana" subtitle="Últimos 90 dias">
          {hasWeekly ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <CartesianGrid stroke="#3E4A2C" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#F0EDD8" fontSize={12} />
                <YAxis stroke="#F0EDD8" fontSize={12} />
                <Tooltip content={<ChartTooltip suffix="R$" />} cursor={{ fill: "rgba(203,178,117,0.1)" }} />
                <Bar dataKey="total" fill="#94833F" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((_, i) => (
                    <Cell key={i} fill={i === bestWeekdayIdx ? "#CBB275" : "#94833F"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoData />
          )}
        </ChartCard>

        <ChartCard title="Faturamento mensal" subtitle="Ano atual">
          {hasMonthly ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CBB275" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#CBB275" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#3E4A2C" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#F0EDD8" fontSize={12} />
                <YAxis stroke="#F0EDD8" fontSize={12} />
                <Tooltip content={<ChartTooltip suffix="R$" />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#CBB275"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                  dot={{ fill: "#CBB275", r: 3 }}
                  activeDot={{ r: 5, fill: "#CBB275" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <NoData />
          )}
        </ChartCard>

        <ChartCard title="Produtos mais vendidos" subtitle="Ano atual · unidades">
          {hasTop ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                <defs>
                  <linearGradient id="topGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#94833F" />
                    <stop offset="100%" stopColor="#CBB275" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#3E4A2C" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#F0EDD8" fontSize={12} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#F0EDD8"
                  fontSize={11}
                  width={140}
                />
                <Tooltip content={<ChartTooltip suffix="un" />} cursor={{ fill: "rgba(203,178,117,0.1)" }} />
                <Bar dataKey="value" fill="url(#topGrad)" radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#CBB275", fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoData />
          )}
        </ChartCard>

        <ChartCard title="Pedidos por status" subtitle="Ano atual">
          {hasStatus ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {statusData.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip suffix="" />} />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ color: "#F0EDD8", fontSize: 12 }}
                    formatter={(v, entry: any) => `${v} — ${entry?.payload?.value}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: "absolute",
                  top: "38%",
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  color: "#CBB275",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  pointerEvents: "none",
                }}
              >
                {live.totalOrdersYear}
              </div>
            </div>
          ) : (
            <NoData />
          )}
        </ChartCard>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-4"
            style={{ background: "#222D17", border: "1px solid #3E4A2C" }}
          >
            <s.icon className="h-5 w-5" strokeWidth={1.5} style={{ color: "#CBB275" }} />
            <div className="mt-1 text-xs" style={{ color: "#A5A17E" }}>
              {s.label}
            </div>
            <div className="font-display text-lg" style={{ color: "#F0EDD8" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: import("react").ReactNode;
}) {
  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "#222D17",
        border: "1px solid #3E4A2C",
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
      }}
    >
      <div className="mb-4">
        <h3 className="font-display text-lg" style={{ color: "#CBB275" }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs" style={{ color: "#A5A17E" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

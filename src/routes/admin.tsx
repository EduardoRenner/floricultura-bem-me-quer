import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Flower2,
  LayoutDashboard,
  LogOut,
  Package,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  adminDeleteProduct,
  adminListOrders,
  adminListProducts,
  adminListSettings,
  adminLogin,
  adminStats,
  adminUpdateOrderStatus,
  adminUpdateSetting,
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
            <span
              className="grid h-10 w-10 place-items-center rounded-full font-display text-[13px] font-bold text-accent"
              style={{ background: "#1A2B1A", border: "2px solid #C4A84F", letterSpacing: "0.05em" }}
            >
              BMQ
            </span>
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
          <span
            className="mx-auto grid h-12 w-12 place-items-center rounded-full font-display text-[14px] font-bold text-accent"
            style={{ background: "#1A2B1A", border: "2px solid #C4A84F", letterSpacing: "0.05em" }}
          >
            BMQ
          </span>
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
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [open, setOpen] = useState(false);

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
                <Label>URL da imagem</Label>
                <Input
                  value={editing.image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://…"
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
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

type Period = "week" | "month" | "year";

const WEEKLY_BY_PERIOD: Record<Period, number[]> = {
  week: [320, 280, 410, 390, 520, 680, 0],
  month: [1420, 1180, 1610, 1690, 1820, 2180, 0],
  year: [15200, 13100, 16400, 17800, 21000, 27600, 0],
};

const MONTHLY_BY_PERIOD: Record<Period, number[]> = {
  week: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2100],
  month: [1200, 980, 1450, 1890, 2100, 2340, 1980, 2560, 2100, 1780, 2890, 3200],
  year: [1200, 980, 1450, 1890, 2100, 2340, 1980, 2560, 2100, 1780, 2890, 3200],
};

const TOP_PRODUCTS = [
  { name: "Rosa Vermelha (unitária)", value: 47 },
  { name: "Buquê de Rosas (12un)", value: 34 },
  { name: "Arranjo Romântico", value: 28 },
  { name: "Arranjo Primavera", value: 22 },
  { name: "Kit Presente Floral", value: 19 },
];

const STATUS_DATA = [
  { name: "Entregue", value: 45, color: "#4CAF50" },
  { name: "Pendente", value: 25, color: "#FFC107" },
  { name: "Em preparo", value: 20, color: "#2196F3" },
  { name: "Cancelado", value: 10, color: "#F44336" },
];

function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "#1E2E1E",
        border: "1px solid #C4A84F",
        borderRadius: 8,
        padding: "8px 12px",
        color: "#F0EDD8",
        fontSize: "0.85rem",
      }}
    >
      {label && <div style={{ color: "#C4A84F", fontWeight: 600 }}>{label}</div>}
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

function ReportsDashboard({ live }: { live: any }) {
  const [period, setPeriod] = useState<Period>("month");

  const weeklyData = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => ({
    day: d,
    total: WEEKLY_BY_PERIOD[period][i],
  }));
  const monthlyData = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ].map((m, i) => ({ month: m, total: MONTHLY_BY_PERIOD[period][i] }));
  const totalOrders = STATUS_DATA.reduce((s, x) => s + x.value, 0);

  const statCards = [
    { icon: "📦", label: "Pedidos hoje", value: live?.todayCount ?? 4 },
    { icon: "⏳", label: "Pedidos pendentes", value: live?.pendingCount ?? 6 },
    {
      icon: "💰",
      label: "Faturamento este mês",
      value: live ? formatBRL(live.monthRevenue) : formatBRL(2340),
    },
    { icon: "🌸", label: "Produtos ativos", value: 10 },
  ];

  const summary = [
    { icon: "📈", label: "Ticket médio", value: "R$ 127,40" },
    { icon: "🏆", label: "Produto campeão", value: "Rosa Vermelha" },
    { icon: "⏰", label: "Horário de pico", value: "10h–11h (Sáb)" },
    { icon: "📅", label: "Melhor mês", value: "Dezembro" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl" style={{ color: "#C4A84F" }}>
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Relatórios e visão geral</p>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "#1E2E1E" }}>
          {(
            [
              { id: "week", label: "Esta semana" },
              { id: "month", label: "Este mês" },
              { id: "year", label: "Este ano" },
            ] as { id: Period; label: string }[]
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="rounded-full px-3 py-1.5 text-xs transition"
              style={
                period === p.id
                  ? { background: "#8B7A3A", color: "#1A2B1A", border: "1px solid #C4A84F" }
                  : { color: "#F0EDD8", border: "1px solid #3A4A3A", background: "transparent" }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-5"
            style={{
              background: "#1E2E1E",
              borderLeft: "4px solid #C4A84F",
              boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            }}
          >
            <div className="text-2xl">{s.icon}</div>
            <div className="mt-2 text-xs" style={{ color: "#9E9E7A" }}>
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
        <ChartCard title="Vendas por Dia da Semana">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyData}>
              <CartesianGrid stroke="#3A4A3A" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#F0EDD8" fontSize={12} />
              <YAxis stroke="#F0EDD8" fontSize={12} />
              <Tooltip content={<ChartTooltip suffix="R$" />} cursor={{ fill: "rgba(196,168,79,0.1)" }} />
              <Bar dataKey="total" fill="#8B7A3A" radius={[4, 4, 0, 0]}>
                {weeklyData.map((_, i) => (
                  <Cell key={i} fill={i === 5 ? "#C4A84F" : "#8B7A3A"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Faturamento Mensal">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C4A84F" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#C4A84F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3A4A3A" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#F0EDD8" fontSize={12} />
              <YAxis stroke="#F0EDD8" fontSize={12} />
              <Tooltip content={<ChartTooltip suffix="R$" />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#C4A84F"
                strokeWidth={2}
                fill="url(#revGrad)"
                dot={{ fill: "#C4A84F", r: 3 }}
                activeDot={{ r: 5, fill: "#C4A84F" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Produtos Mais Vendidos">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={TOP_PRODUCTS} layout="vertical" margin={{ left: 20 }}>
              <defs>
                <linearGradient id="topGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B7A3A" />
                  <stop offset="100%" stopColor="#C4A84F" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3A4A3A" strokeDasharray="3 3" />
              <XAxis type="number" stroke="#F0EDD8" fontSize={12} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#F0EDD8"
                fontSize={11}
                width={140}
              />
              <Tooltip content={<ChartTooltip suffix="un" />} cursor={{ fill: "rgba(196,168,79,0.1)" }} />
              <Bar dataKey="value" fill="url(#topGrad)" radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#C4A84F", fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pedidos por Status">
          <div className="relative">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={STATUS_DATA}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {STATUS_DATA.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip suffix="%" />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ color: "#F0EDD8", fontSize: 12 }}
                  formatter={(v, entry: any) => `${v} — ${entry?.payload?.value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: "absolute",
                top: "40%",
                left: 0,
                right: 0,
                textAlign: "center",
                color: "#C4A84F",
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.75rem",
                fontWeight: 700,
                pointerEvents: "none",
              }}
            >
              {totalOrders}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-4"
            style={{ background: "#1E2E1E", border: "1px solid #3A4A3A" }}
          >
            <div className="text-xl">{s.icon}</div>
            <div className="mt-1 text-xs" style={{ color: "#9E9E7A" }}>
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

function ChartCard({ title, children }: { title: string; children: import("react").ReactNode }) {
  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "#1E2E1E",
        border: "1px solid #3A4A3A",
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
      }}
    >
      <h3
        className="mb-4 font-display text-lg"
        style={{ color: "#C4A84F" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

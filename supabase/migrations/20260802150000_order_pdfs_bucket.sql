-- Bucket privado para os PDFs de pedido gerados no fechamento do pedido.
-- Ao contrário de product-images (público), este NÃO tem policy de leitura
-- pública: o PDF carrega endereço e telefone do cliente, então só é acessível
-- via signed URL de curta duração, gerada pela service role e enviada na
-- mensagem do WhatsApp da loja.
insert into storage.buckets (id, name, public)
values ('order-pdfs', 'order-pdfs', false)
on conflict (id) do nothing;

-- Nenhuma policy de leitura/escrita pública é criada de propósito — todo
-- acesso ao bucket passa pela service role (server function), que ignora RLS.

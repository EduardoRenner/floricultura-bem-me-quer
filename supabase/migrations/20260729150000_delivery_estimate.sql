-- Substitui a promessa automática de prazo por uma previsão opcional que a
-- loja publica quando quiser.
--
-- O modelo anterior (chave "entrega no mesmo dia" + horário de corte) fazia o
-- site anunciar "peça até 16h e entregamos hoje". Mas quem sabe o prazo real é
-- quem atende, olhando o movimento do dia, e esse prazo é dado na resposta do
-- WhatsApp depois que o pedido chega. O site prometer um número seria assumir
-- compromisso que a loja não controla.
--
-- Agora: por padrão o site só avisa que o prazo é combinado no WhatsApp. Se a
-- loja quiser, publica uma previsão ("até 1 hora") pelo painel.

DELETE FROM public.settings WHERE key IN ('delivery_same_day', 'delivery_cutoff');

INSERT INTO public.settings (key, value, is_public) VALUES
  ('delivery_estimate', '""'::jsonb, true)
ON CONFLICT (key) DO NOTHING;

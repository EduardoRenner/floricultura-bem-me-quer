-- Prazo de entrega e horários de funcionamento passam a ser configuração da
-- loja, não texto fixo no código.
--
-- Motivo: a loja entrega no mesmo dia, mas "depende da demanda". Uma promessa
-- fixa no site mente em domingo, fora do horário e em data de pico — e cliente
-- que lê "entrega hoje" e não recebe hoje vira avaliação ruim no Google, que é
-- justamente o ativo da loja. Com a chave abaixo, quem decide é quem atende.
--
-- Todas são is_public = true: a policy "Public settings are readable" já
-- permite leitura anônima desse subconjunto, e nada aqui é sensível.

INSERT INTO public.settings (key, value, is_public) VALUES
  -- Aceitando entrega no mesmo dia agora? Desligue em dia cheio.
  ('delivery_same_day', 'true'::jsonb, true),
  -- Até que horas o pedido garante entrega hoje.
  ('delivery_cutoff', '"16:00"'::jsonb, true),
  -- Observação livre exibida junto do prazo. Ex.: "Centro e bairros próximos".
  ('delivery_note', '""'::jsonb, true),
  -- Horários de atendimento. dia: 0 = domingo … 6 = sábado.
  -- Cada faixa é [abre, fecha]; lista vazia = fechado naquele dia.
  ('business_hours', '[
     {"dia":0,"faixas":[]},
     {"dia":1,"faixas":[["08:00","11:30"],["13:00","18:30"]]},
     {"dia":2,"faixas":[["08:00","11:30"],["13:00","18:30"]]},
     {"dia":3,"faixas":[["08:00","11:30"],["13:00","18:30"]]},
     {"dia":4,"faixas":[["08:00","11:30"],["13:00","18:30"]]},
     {"dia":5,"faixas":[["08:00","11:30"],["13:00","18:30"]]},
     {"dia":6,"faixas":[["08:00","12:00"]]}
   ]'::jsonb, true)
ON CONFLICT (key) DO NOTHING;

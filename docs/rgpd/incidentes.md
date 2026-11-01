# Plano de incidentes

O que fazer se houver (ou se suspeitar de) uma fuga ou perda de dados de clientes.

## Quem

- **Decide e avisa:** a Catarina (responsável pelo tratamento).
- **Investiga e corrige:** o Miguel (acesso ao Supabase, Vercel, Resend, GitHub).

## Primeiras horas

1. **Conter.** Conforme o caso:
   - Chave `service_role` ou segredos expostos: no Supabase, Settings → API, rodar as chaves. Atualizar `SUPABASE_SERVICE_ROLE_KEY` na Vercel e fazer redeploy.
   - `CRON_SECRET`: gerar um novo, atualizar na Vercel e no Vault do Supabase (`cron_secret`).
   - `PAINEL_SESSAO_SECRET`: gerar um novo e fazer redeploy (fecha todas as sessões do painel).
   - `RESEND_API_KEY`: revogar no Resend e criar outra.
   - Telemóvel da Catarina perdido: no Supabase, Authentication → Users, terminar as sessões dela e remover o fator MFA; ela volta a configurar a app autenticadora.
   - Conta de cliente comprometida: apagar as sessões dessa utilizadora no Supabase.
2. **Perceber o alcance.** Que dados, de quantas clientes, desde quando. Ver `audit_log`, os logs da Vercel e do Supabase.
3. **Registar tudo** numa nota: data e hora, o que aconteceu, o que foi feito. Guardar mesmo que não seja preciso avisar ninguém (art. 33.º, n.º 5).

## Avisar

- **CNPD:** em até **72 horas** depois de saber, se houver risco para as clientes. Formulário em https://www.cnpd.pt/ (notificação de violação de dados).
- **Clientes afetadas:** sem demora, se o risco for elevado (por exemplo, emails e telemóveis expostos publicamente). Mensagem simples: o que aconteceu, que dados, o que fizemos, o que podem fazer, contacto.
- **Não é preciso avisar** se os dados estiverem ilegíveis para terceiros ou se o risco for improvável, mas fica o registo.

## Depois

- Corrigir a causa, acrescentar um teste que a apanhe e rever este plano.

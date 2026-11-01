# Registo de atividades de tratamento

Artigo 30.º do RGPD. Atualizado a 1 de novembro de 2026. Rever sempre que a app passar a guardar dados novos.

## Responsável

- **Responsável pelo tratamento:** Catarina Neves, Largo de Santo António, São Cosme, Gondomar.
- **Contacto para dados:** kiks1711@gmail.com
- **Encarregado de proteção de dados:** não é obrigatório (microempresa, sem tratamento em grande escala nem dados sensíveis).

## Atividade 1. Marcações

|            |                                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finalidade | Fazer, gerir, lembrar e cancelar marcações; contactar a cliente se houver mudança                                                                                           |
| Titulares  | Clientes (com e sem conta)                                                                                                                                                  |
| Dados      | Nome, telemóvel, email (opcional), serviço, dia e hora, preço, estado, origem (online ou painel), faltas                                                                    |
| Base legal | Execução de contrato (art. 6.º, n.º 1, b)); faltas e bloqueios: interesse legítimo (f))                                                                                     |
| Quem acede | Catarina (painel com MFA); a própria cliente (conta)                                                                                                                        |
| Prazo      | Anonimização automática ao fim de 24 meses sem marcações (job `anonymize-inactive-clients`); tokens de cancelamento apagados quando a marcação passa (`purge-stale-tokens`) |

## Atividade 2. Conta da cliente

|            |                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Finalidade | Entrar sem palavra-passe, ver e cancelar marcações, gerir os dados                              |
| Dados      | Email, sessão (cookie), ligação à ficha de cliente                                              |
| Base legal | Execução de contrato                                                                            |
| Prazo      | Até a cliente apagar a conta; contas nunca confirmadas são apagadas (`purge-unconfirmed-users`) |

## Atividade 3. Notas da Catarina

|            |                                                        |
| ---------- | ------------------------------------------------------ |
| Finalidade | Preferências de serviço (formato, cores, horários)     |
| Base legal | Interesse legítimo                                     |
| Regra      | **Nunca** alergias nem dados de saúde (aviso no campo) |
| Prazo      | Igual à ficha da cliente                               |

## Atividade 4. Segurança e estatísticas

|                       |                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Finalidade            | Proteger formulários contra abuso; contar visitas                                                                                                                                                                              |
| Dados                 | IP (só para limites de pedidos, apagado de hora a hora pelo job `purge-rate-limits`); sinais do Turnstile; visitas sem cookies e sem identificação (Vercel Web Analytics, sem parâmetros nem tokens no endereço, sem o painel) |
| Base legal            | Interesse legítimo                                                                                                                                                                                                             |
| Registo de alterações | `audit_log` guarda ids e nomes de colunas, nunca valores pessoais                                                                                                                                                              |

## Subcontratantes

| Fornecedor | Serviço                                          | Onde                    | DPA aceite |
| ---------- | ------------------------------------------------ | ----------------------- | ---------- |
| Supabase   | Base de dados, autenticação, ficheiros           | UE (Irlanda, eu-west-1) | [ ]        |
| Vercel     | Alojamento, funções (Frankfurt, fra1), analytics | UE / global             | [ ]        |
| Resend     | Envio de emails                                  | UE                      | [ ]        |
| Cloudflare | Turnstile (anti-spam)                            | Global                  | [ ]        |

Guardar uma cópia (PDF) de cada DPA nesta pasta quando for aceite.

## Transferências para fora da UE

Vercel, Resend, Cloudflare e Supabase são empresas dos EUA. Os dados das clientes ficam guardados na UE; as transferências que existam estão cobertas pelas cláusulas contratuais-tipo dos DPA e pelo EU-US Data Privacy Framework.

## Direitos das titulares

- Ver, corrigir, exportar e apagar: na conta ("Os meus dados") ou no painel (ficha da cliente: exportar e apagar).
- Prazo de resposta: 1 mês. Registar os pedidos recebidos por email numa nota com data e o que foi feito.

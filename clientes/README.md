# 🏢 Registro Central de Clientes | Publify System

Este diretório armazena o espaço de trabalho individual e isolado de cada cliente gerenciado pela sua agência / consultoria.

---

## 👥 Clientes Ativos

| Cliente | ID da Conta de Anúncios | Status | Pasta de Trabalho |
| :--- | :--- | :---: | :--- |
| **Connect Digital** | `act_CONNECT_DIGITAL_OFICIAL` | 🟢 Ativo | [`./Connect Digital`](./Connect%20Digital) |
| **Gauchinho de Deus** | `act_101657350274220` | 🟢 Ativo | [`./Gauchinho de Deus`](./Gauchinho%20de%20Deus) |

---

## 📖 Procedimento Operacional Padrão (SOP)
Para adicionar novos clientes sem bloqueios de permissão, limites de conta ou erros de autorização:
👉 **Consulte o [Manual de Onboarding e Conexão de Clientes na BM](./GUIA_ONBOARDING_E_CONEXAO_BM.md)**

---

## 📁 Estrutura Padrão para Novos Clientes

Ao adicionar um novo cliente, siga a estrutura modular:

```text
clientes/
  └── [Nome do Cliente]/
      ├── PERFIL_CLIENTE.md       # Informações cadastrais, IDs, saldo, metas de CPA e ROAS
      ├── estrategia/             # Estrutura de campanhas, públicos e funil
      ├── criativos/              # Copies, roteiros de vídeos, artes e variações
      └── relatorios/             # Relatórios semanais, quinzenais e logs de otimização
```

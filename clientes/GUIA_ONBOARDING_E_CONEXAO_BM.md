# 📘 Manual Definitivo de Onboarding de Clientes no Meta Ads
### Gestão de Tráfego Profissional via Portfólio Empresarial (BM) | Connect Digital

Este guia é o Procedimento Operacional Padrão (SOP) para conectar, autorizar e ativar campanhas de futuros clientes no seu Portfólio Empresarial (**Connect Digital**) sem bloqueios, travamentos de permissões ou erros de veiculação.

---

## 🏛️ 1. Entendendo a Arquitetura da Meta (O Porquê dos Erros)

Para veicular anúncios sem erros, a Meta exige que **4 engrenagens** estejam conectadas simultaneamente:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   SEU PORTFÓLIO: Connect Digital                       │
│                                                                        │
│   [Seu Perfil Pessoal: Rafael Placido]                                 │
│        │ (precisa estar atribuído a TODOS os ativos recebidos)         │
│        ▼                                                               │
│   ┌────────────────────────┐         ┌─────────────────────────────┐   │
│   │   PÁGINA DO FACEBOOK   │ ◄─────► │      CONTA DE ANÚNCIOS      │   │
│   │   (Identidade visual)  │         │      (Saldo e Cobrança)     │   │
│   └────────────────────────┘         └─────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

* **Erro #1885499 ("O visualizador deve ter permissão de anunciante na Página"):**  
  Acontece quando você tem acesso à Conta de Anúncios, mas o seu perfil pessoal não recebeu autorização de anunciante diretamente na Página do Facebook.
* **Erro #2708008 ("Sem autorização para temas sociais/eleições/política"):**  
  Acontece quando a categoria especial está ativa, mas a identidade pessoal não foi confirmada ou o rótulo ("Pago por...") não vinculou a conta de anúncios.
* **Erro de Conta Travada com Saldo Disponível:**  
  Acontece quando o limite de gastos acumulados (`spend_cap`) da conta atinge o teto anterior e precisa ser resetado.

---

## 🚀 2. Fluxo Padrão: Clientes Comerciais (E-commerce, Negócios Locais, Serviços)

Para 95% dos clientes convencionais, siga este fluxo em **3 etapas simples**:

### 🔹 Etapa 1: Enviar Solicitação de Parceria ao Cliente
1. Acesse o seu portfólio: **[business.facebook.com/settings/partners](https://business.facebook.com/settings/partners)**.
2. Na aba **Parceiros**, clique em **Adicionar** → **Solicitar ativos de um parceiro para trabalhar em nome dele**.
3. Insira o e-mail do cliente ou peça para o cliente compartilhar os ativos usando o **ID do seu Portfólio Connect Digital**.
4. **Ativos que você deve solicitar:**
   * ✅ **Página do Facebook:** Permissão de *Criar anúncios* e *Ver insights* (ou Controle total).
   * ✅ **Conta de Anúncios:** Permissão de *Gerenciar campanhas* (ou Controle total).
   * ✅ **Conta do Instagram:** Acesso para anúncios.
   * ✅ **Conjunto de Dados (Pixel):** Permissão de *Gerenciar conjunto de dados*.

---

### 🔹 Etapa 2: A Etapa Crucial que a Maioria Esquece (Atribuir a Si Mesmo!)
> ⚠️ **Atenção:** Receber o ativo do cliente no portfólio **NÃO** dá permissão automática ao seu perfil pessoal! Você precisa se atribuir internamente.

Assim que o cliente aceitar a parceria:
1. No seu portfólio, vá em **Contas** → **Páginas**:
   * Clique na Página do cliente.
   * Clique em **Atribuir pessoas**.
   * Marque o seu nome (**Rafael Placido**) e ative a permissão de **Criar anúncios**.
2. Vá em **Contas** → **Contas de anúncios**:
   * Clique na Conta do cliente.
   * Clique em **Atribuir pessoas**.
   * Marque o seu nome (**Rafael Placido**) e dê controle de **Gerenciar campanhas**.

---

### 🔹 Etapa 3: Checagem Financeira da Conta
Antes de publicar qualquer campanha:
1. Acesse: **[Gerenciador de Cobrança](https://adsmanager.facebook.com/billing_hub)** selecionando a conta do cliente.
2. Verifique:
   * Se a forma de pagamento é **Cartão de Crédito** ou **Pré-Pago** (Boleto/Pix).
   * Se for pré-pago, confirme se há saldo disponível.
   * Vá em **Definições de pagamento** → **Limite de gastos da conta** e garanta que o limite não está travado em R$ 0,00 ou no limite máximo atingido.

---

## 🏛️ 3. Fluxo Especial: Campanhas Políticas, Eleitorais ou Temas Sociais

Campanhas de candidatos, partidos ou causas sociais exigem **4 travas extras de segurança** impostas pela Meta e pela Justiça Eleitoral (TSE):

### 🛡️ Trava 1: Confirmação de Identidade Pessoal (Obrigatória)
Quem cria ou opera a campanha precisa ter identidade confirmada:
* Link: **[facebook.com/id](https://www.facebook.com/id)**
* Envie documento com foto (RG ou CNH).
* Ative a autenticação de dois fatores (2FA).
* *Status necessário:* **Identidade Confirmada**.

---

### 🏷️ Trava 2: Criação e Vinculação do Rótulo ("Pago Por...")
Para evitar rejeição automática do criativo eleitoral:
1. Acesse as configurações de temas sociais da página do cliente:  
   👉 **`https://www.facebook.com/[ID_DA_PAGINA]/settings/?tab=issue_ads`**
2. Crie ou selecione o rótulo:
   * **Tipo Recomendado:** **"Pago Por"** (ou Propaganda Eleitoral com CNPJ de campanha).
   * Insira CNPJ de campanha, telefone e endereço oficial.
3. 🔴 **PONTO CRÍTICO:** Clique em **Contas de anúncios vinculadas ao rótulo** e marque a Conta de Anúncios do cliente (`act_...`).  
   *(Se a conta não estiver marcada aqui, o anúncio é bloqueado no leilão).*

---

### 🔑 Trava 3: Acesso Direto na Raiz da Página (Anti-Erro #1885499)
Para garantir que o Gerenciador de Anúncios no navegador reconheça seu perfil:
1. Logado na Página do cliente, acesse:  
   👉 **`https://www.facebook.com/[ID_DA_PAGINA]/settings/?tab=profile_access`**  
   *(Caminho: Configurações da Página → Nova experiência de Páginas → Acesso à Página)*.
2. Em **Pessoas com acesso do Facebook**, clique em **Adicionar novo**.
3. Busque pelo seu perfil pessoal (**Rafael Placido** ou ID `4547657085380639`).
4. Conceda acesso com controle para anúncios.
5. Aceite a notificação no seu perfil pessoal.

---

### ⚙️ Trava 4: Configuração da Categoria Especial no Gerenciador
Ao criar a campanha:
* **Categoria de Anúncio Especial:** Selecione obrigatoriamente **Temas sociais, eleições ou política**.
* **País:** Brasil.
* **Isenção de Responsabilidade (Rótulo):** No nível do anúncio, certifique-se de que o rótulo "Pago Por [Nome do Candidato]" está selecionado.

---

## 🤖 4. Módulo de Automação / API (Publify System)

Se você for utilizar automações, robôs ou este sistema de inteligência para subir e auditar campanhas via Meta Graph API:

1. **App no Meta Developers:**  
   * O aplicativo (ex: `ConnectDigittall Automated`) **DEVE** estar em modo **Em Produção (Live)** no [developers.facebook.com](https://developers.facebook.com).  
   *(Se o app estiver em modo Desenvolvimento, terceiros não conseguem ver os criativos criados via API).*
2. **Usuário do Token da API (`Gerenciador IA`):**  
   * Deve ser adicionado à Página do cliente como membro com permissão de *Anúncios* (`ADVERTISE`) e na Conta de Anúncios como *Gerenciador de campanhas*.

---

## 📋 5. Checklist Pré-Voo (Bata antes de dar o Play)

| # | Item de Verificação | Como Checar | Status |
| :-: | :--- | :--- | :-: |
| 1 | **Parceria BM ativa** | BM → Parceiros | [ ] |
| 2 | **Rafael Placido atribuído na Página** | BM → Páginas → Pessoas | [ ] |
| 3 | **Rafael Placido atribuído na Conta** | BM → Contas de Anúncios → Pessoas | [ ] |
| 4 | **Saldo / Pagamento validado** | Cobrança → Saldo pré-pago ou cartão ativo | [ ] |
| 5 | **Limite de gastos (`spend_cap`) verificado** | Não está zerado nem atingido | [ ] |
| 6 | **Página e Instagram sincronizados** | Configurações da Página → Contas vinculadas | [ ] |
| 7 | *(Se político)* **Rótulo "Pago por" vinculado à conta** | Página → Configurações → Rótulos | [ ] |
| 8 | *(Se político)* **Acesso direto na Nova Experiência** | Página → Acesso à Página → Rafael Placido | [ ] |
| 9 | **Campanha criada em PAUSED** | Subir pausada para conferência final | [ ] |
| 10 | **Conferência de Criativo & Link** | Link da página e WhatsApp/Direct testados | [ ] |

---

## 💡 Modelo de Mensagem para Enviar ao Novo Cliente (Onboarding Express)

Copie e envie para o cliente no WhatsApp para agilizar o processo:

> *"Olá! Para começarmos a gestão profissional dos seus anúncios com total segurança, preciso que você me conceda acesso aos ativos da sua empresa pelo Meta Business Suite.*
> 
> *1. Acesse: **business.facebook.com/settings/partners***  
> *2. Clique em **Adicionar Parceiro** e insira o ID da minha agência: `[INSERIR_ID_DA_BM_CONNECT_DIGITAL]`*  
> *3. Selecione a sua **Página do Facebook**, sua **Conta de Anúncios** e seu **Instagram**, marcando a opção **Criar Anúncios / Gerenciar Campanhas**.*  
> 
> *Assim que confirmar, nosso sistema já conecta a estrutura e começamos o setup das campanhas!"*

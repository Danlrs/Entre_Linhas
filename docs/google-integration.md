# Guia de ativação — Entre Linhas

Este guia corresponde ao código deste repositório. As alterações foram preparadas localmente; criar credenciais, executar SQL e publicar são etapas nos seus painéis. Não é preciso transferir o site para o Google Cloud.

## 1. Entenda o papel de cada serviço

- **Render** executa o backend: `https://entrelinhas-wj3f.onrender.com`. As rotas da API começam com `/api`.
- **Cloudflare Pages** entrega o frontend. O endereço informado é `https://27ebf5b9.entrelinhas-lrs.pages.dev/` — sem o ponto depois da barra.
- **Supabase** guarda o PostgreSQL e as fotos no Storage: `https://szuohznhujtrlrlacfub.supabase.co`.
- **Google Cloud** será usado somente para criar as credenciais que permitem login, seleção do Drive e envio via Gmail. Criar esse projeto de credenciais não move banco, frontend nem backend.

O login continua no NestJS. Não ative Supabase Auth para este fluxo e não cadastre um callback de autenticação do Supabase.

A URL `27ebf5b9...pages.dev` tem o formato de uma publicação específica. Abra **Cloudflare → Workers & Pages → entrelinhas-lrs → Deployments** e confira o endereço de produção. O endereço esperado pelo nome é `https://entrelinhas-lrs.pages.dev`, mas confirme no painel. As URLs de publicações antigas podem continuar mostrando código antigo. [Como funcionam publicações de preview](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

## 2. Execute as migrações SQL no Supabase

Uma migração altera a estrutura do banco existente. Ela não exige apagar tabelas nem cadastrar os usuários novamente.

1. Entre em [Supabase Dashboard](https://supabase.com/dashboard).
2. Abra o projeto cuja referência é `szuohznhujtrlrlacfub`. Você também pode acessar [o SQL Editor desse projeto](https://supabase.com/dashboard/project/szuohznhujtrlrlacfub/sql/new).
3. Abra **SQL Editor → New query**. Confirme que está no projeto correto.
4. No repositório, abra `database/migrations/005-google-login.sql`, copie o conteúdo inteiro e cole na consulta.
5. Clique em **Run**. O esperado é uma mensagem de sucesso, frequentemente “Success. No rows returned”.
6. Crie outra consulta e repita com o conteúdo inteiro de `database/migrations/006-password-recovery.sql`.
7. As duas migrações podem ser reexecutadas. Execute-as antes de publicar o backend novo.

**Não execute `database/init.sql` sobre o banco existente.** Ele serve para instalações novas e contém toda a estrutura inicial. Para esta atualização, use somente as migrações 005 e 006.

A migração 005 adiciona a coluna opcional `google_subject` à tabela `usuarios`. A migração 006 cria `password_resets`, onde ficam os hashes de recuperação, expiração e contadores. Ela também habilita RLS e remove acesso público a essa tabela; o NestJS continua acessando pelo usuário PostgreSQL privado já configurado.

Para conferir sem revelar dados de usuários, execute:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'google_subject';

SELECT to_regclass('public.password_resets') AS tabela_recuperacao;
```

A primeira consulta deve retornar `google_subject`. A segunda deve mostrar `password_resets`. Se houver erro na migração, pare essa etapa e confira a mensagem antes de publicar. Não desative o RLS para tentar contornar um erro.

Se o projeto ainda não tiver `refresh_tokens`, execute também a migração existente `004-refresh-tokens.sql`; ela já era necessária para o login anterior. Não é necessário repetir outras migrações que já foram aplicadas.

## 3. Confira o Storage do Supabase

1. No mesmo projeto, abra **Storage**.
2. Use o bucket que já guarda as imagens do site. Se ainda não houver um, crie `entrelinhas-uploads`.
3. O catálogo precisa conseguir ler suas fotos sem login: configure esse bucket de imagens como público. A tabela de recuperação não tem relação com esse bucket.
4. Nas restrições do bucket, permita **`image/webp`**. O sistema agora salva todas as novas fotos nesse formato.
5. Configure um limite por arquivo de pelo menos **1 MiB (1.048.576 bytes)**, ou maior. O alvo padrão de compressão é 1 MiB.
6. Preserve os arquivos antigos: a atualização só comprime novos envios.

O Supabase possui limite por arquivo e cota total de armazenamento. Comprimir uma foto ajuda nos dois, mas uma sequência de uploads ainda pode consumir a cota total. Acompanhe **Storage/Usage**; a aplicação não apaga fotos antigas automaticamente. [Limites do Storage](https://supabase.com/docs/guides/storage/uploads/file-limits).

## 4. Crie o projeto de credenciais no Google

1. Entre em [Google Cloud Console](https://console.cloud.google.com/) com a conta que administrará a integração, preferencialmente `contato.entrelinhaslrs@gmail.com`.
2. No seletor de projeto no topo, escolha **New project / Novo projeto**.
3. Use um nome como `Entre Linhas Integracoes` e clique em **Create / Criar**.
4. Selecione esse projeto depois de criado. Não crie VM, Cloud Run ou banco no Google.
5. Abra **APIs & Services → Library** e habilite, uma por vez: **Google Drive API**, **Google Picker API** e **Gmail API**.
6. Abra **Google Auth Platform**. Se aparecer **Get started**, inicie a configuração.
7. Em **Branding**, informe `Entre Linhas`, o e-mail de suporte e seu contato de desenvolvedor.
8. Em **Audience**, escolha **External** para contas Gmail comuns. Enquanto estiver em **Testing**, adicione como usuários de teste o Gmail remetente e as contas que testarão login e Drive.
9. Em **Data Access**, adicione os escopos `https://www.googleapis.com/auth/drive.file` e `https://www.googleapis.com/auth/gmail.send`. O escopo de envio é para a autorização do remetente; o site não pede acesso ao Gmail dos usuários.

Os nomes dos menus podem aparecer traduzidos. `gmail.send` autoriza envio de mensagens, sem solicitar leitura da caixa postal. [Escopos da Gmail API](https://developers.google.com/workspace/gmail/api/auth/scopes).

## 5. Crie o cliente OAuth do site: login e Drive

1. Abra **Google Auth Platform → Clients → Create client** (em algumas interfaces, **APIs & Services → Credentials → Create credentials → OAuth client ID**).
2. Tipo: **Web application / Aplicativo da Web**.
3. Nome: `Entre Linhas Web`.
4. Em **Authorized JavaScript origins**, adicione:

```text
https://27ebf5b9.entrelinhas-lrs.pages.dev
https://entrelinhas-lrs.pages.dev
http://localhost:4200
```

Cadastre a segunda origem somente após confirmá-la como endereço principal; `localhost` é opcional para desenvolvimento. Adicione também um domínio próprio se for usado. Não coloque `/admin`, `/api`, `/*`, barra final ou ponto final nessas origens. Novos endereços de preview precisam ser cadastrados individualmente se você quiser usá-los.

5. Esse cliente do site usa popup com callback JavaScript; não precisa de URI de redirecionamento.
6. Salve e copie o **Client ID**, que termina em `.apps.googleusercontent.com`. Ele será `GOOGLE_CLIENT_ID` no Render. O client secret desse cliente não é usado pelo frontend.

O backend verifica o token com a biblioteca oficial e associa a conta pelo identificador estável do Google. O primeiro vínculo é feito após entrar com senha, em Configurações → Conta. Uma conta Google desconhecida não cria um administrador automaticamente. [Validação de identidade](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## 6. Crie a chave do seletor do Drive

1. Abra **APIs & Services → Credentials → Create credentials → API key**.
2. Edite a chave criada. Em restrições de aplicativo, selecione **Websites / HTTP referrers**.
3. Adicione `https://27ebf5b9.entrelinhas-lrs.pages.dev/*`, o endereço principal confirmado com `/*` e, se necessário, `http://localhost:4200/*`.
4. Restrinja as APIs à **Google Picker API** e à **Google Drive API**. Salve.
5. Essa chave será `GOOGLE_PICKER_API_KEY` no Render.
6. Abra as informações do projeto e copie **Project number / Número do projeto**, composto de dígitos. Será `GOOGLE_CLOUD_PROJECT_NUMBER`. Não use o nome nem o ID textual do projeto.

O client ID, a chave Picker e o número devem pertencer ao mesmo projeto. Eles são identificadores públicos enviados ao navegador. A chave deve continuar restrita aos seus sites. [Configuração do Picker](https://developers.google.com/workspace/drive/picker/guides/web-picker-sample).

## 7. Autorize o Gmail remetente

O remetente configurado é **contato.entrelinhaslrs@gmail.com**. O código não pode enviar mensagens dessa conta sem a autorização do proprietário.

O Render gratuito bloqueia as portas SMTP 25, 465 e 587. Por isso esta implementação usa **Gmail API por HTTPS**, sem senha normal do Gmail ou senha de aplicativo. [Restrição do Render](https://render.com/docs/free).

Crie um segundo cliente OAuth do tipo **Web application**, chamado `Entre Linhas Gmail Backend`. Em **Authorized redirect URIs**, adicione exatamente:

```text
https://developers.google.com/oauthplayground
```

Guarde o client ID e o client secret desse segundo cliente. Eles serão `GMAIL_CLIENT_ID` e `GMAIL_CLIENT_SECRET` no Render. Esse cliente não precisa das origens JavaScript do site.

Para obter o refresh token:

1. Abra o [OAuth Playground oficial](https://developers.google.com/oauthplayground/).
2. Clique na engrenagem. Marque **Use your own OAuth credentials** e informe o ID e o secret do cliente Gmail.
3. Mantenha **OAuth endpoints: Google**, **Access type: Offline** e **Force prompt: Consent Screen**.
4. Feche a configuração. No Step 1, informe `https://www.googleapis.com/auth/gmail.send` e clique em **Authorize APIs**.
5. Autorize usando **contato.entrelinhaslrs@gmail.com**.
6. No Step 2, clique em **Exchange authorization code for tokens**.
7. Copie **Refresh token** para `GMAIL_REFRESH_TOKEN` no Render. Não copie o access token.

Use suas próprias credenciais: com as credenciais padrão do Playground, os refresh tokens são revogados em 24 horas. [Instruções do Playground](https://developers.google.com/oauthplayground/).

Enquanto o app OAuth externo estiver em **Testing**, o refresh token com escopo Gmail normalmente expira em sete dias. Para operação contínua, conclua as exigências exibidas em **Audience / Verification Center**, publique o app OAuth e gere novamente a autorização do remetente. Publicar o status do app não conclui automaticamente eventual verificação de escopos sensíveis. Tokens também podem ser revogados pelo proprietário. [Validade dos tokens Google](https://developers.google.com/identity/protocols/oauth2#expiration).

Os destinatários dos códigos não precisam autorizar Gmail nem ser usuários de teste: apenas a conta remetente autoriza o envio. Login e Drive têm seus próprios consentimentos.

## 8. Configure as variáveis no Render

Abra **Render → serviço entrelinhas-wj3f → Environment**. Preserve as variáveis atuais de banco e JWT. Adicione/atualize:

```dotenv
GOOGLE_CLIENT_ID=ID_DO_CLIENTE_ENTRE_LINHAS_WEB.apps.googleusercontent.com
GOOGLE_PICKER_API_KEY=CHAVE_RESTRITA_DO_PICKER
GOOGLE_CLOUD_PROJECT_NUMBER=NUMERO_DO_PROJETO

GMAIL_CLIENT_ID=ID_DO_CLIENTE_GMAIL_BACKEND.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=SEGREDO_DO_CLIENTE_GMAIL_BACKEND
GMAIL_REFRESH_TOKEN=REFRESH_TOKEN_AUTORIZADO_PELO_REMETENTE
GMAIL_SENDER=contato.entrelinhaslrs@gmail.com

SUPABASE_URL=https://szuohznhujtrlrlacfub.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_PRIVADA_JA_USADA_NO_BACKEND
SUPABASE_STORAGE_BUCKET=entrelinhas-uploads

IMAGE_TARGET_BYTES=1048576
UPLOAD_MAX_FILE_BYTES=5242880
UPLOAD_MAX_INPUT_BYTES=52428800
```

Substitua os valores explicativos pelas credenciais reais; não copie os textos de exemplo como valores. Se o bucket atual tiver outro nome, mantenha esse nome. `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` e `SUPABASE_SERVICE_ROLE_KEY` ficam somente no Render, nunca em arquivos versionados ou no frontend.

Configure `CORS_ORIGINS` com as origens que você realmente usará, separadas por vírgula. Se o endereço principal foi confirmado:

```dotenv
CORS_ORIGINS=https://entrelinhas-lrs.pages.dev,https://27ebf5b9.entrelinhas-lrs.pages.dev,http://localhost:4200
```

`SUPABASE_URL` é o endereço da API/Storage, **não** o host PostgreSQL. Não substitua `DB_HOST` por ele. Mantenha a conexão PostgreSQL/pooler já funcionando no serviço.

As variáveis de imagem significam: alvo de saída de 1 MiB, teto de saída de 5 MiB e proteção técnica de 50 MiB para originais recebidos pelo servidor. O alvo efetivo é o menor entre alvo e teto. Se diminuir o limite do bucket, ajuste também o alvo para não ultrapassá-lo.

## 9. Publique as mudanças

1. Confirme que as migrações terminaram com sucesso.
2. Envie os arquivos alterados e os dois `package-lock.json` para a branch conectada aos deploys. Se usa Git, confira as alterações, faça commit e push pelo fluxo habitual do projeto.
3. No Render, confirme **Root directory: backend**, build `npm ci --include=dev && npm run build` e start `npm run start:prod` (também presentes no `render.yaml`). Publique o commit novo com as variáveis configuradas.
4. Confira o health check em `https://entrelinhas-wj3f.onrender.com/api/health`. O esperado é `{"ok":true}`.
5. Abra `https://entrelinhas-wj3f.onrender.com/api/auth/google/config`. Deve mostrar os identificadores públicos do Google. Nunca deve mostrar `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` ou chave privada Supabase.
6. Publique o frontend na Cloudflare com as configurações existentes. A API de produção já está apontando para `https://entrelinhas-wj3f.onrender.com/api` em `environment.prod.ts`.
7. Acesse o endereço principal confirmado ou a **nova** URL da publicação. Uma URL com hash antigo pode continuar mostrando a versão anterior.

Nenhuma variável secreta precisa ser colocada na Cloudflare Pages para esses recursos.

## 10. Teste os fluxos completos

**Login:** em `/admin`, entre com usuário e senha; repita usando o e-mail. Em **Configurações → Conta**, vincule o Google. Saia e teste a entrada pelo botão Google.

**Recuperação:** clique em **Esqueci minha senha**, informe o e-mail de uma conta cadastrada e aguarde o código. Confira remetente e spam. Digite os seis números, crie uma nova senha de pelo menos oito caracteres e volte ao login. Teste a nova senha e confirme que a antiga deixou de funcionar. Um código usado ou expirado deve ser recusado. E-mails não cadastrados recebem a mesma resposta na tela, mas não geram mensagem.

O código dura dez minutos e admite cinco tentativas. Reenvios têm intervalo mínimo de um minuto e cota de cinco por conta por hora. Depois da validação, o token de redefinição dura mais dez minutos e só pode ser usado uma vez. Ele permanece apenas na memória da tela; ao recarregar, recomece o fluxo. Ao redefinir a senha, as sessões de refresh anteriores são revogadas. Tokens de acesso já emitidos expiram no prazo configurado em `JWT_ACCESS_EXPIRES_IN` (padrão quinze minutos).

**Fotos:** teste uma foto grande do celular, um PNG e uma imagem do Drive. Salve o produto, material ou estampa. Confira no Storage que o arquivo novo é `.webp` e ocupa até o alvo configurado. O arquivo original não é alterado. As fotos são reduzidas para até 2048 pixels no lado maior e podem diminuir mais para atingir o alvo. Metadados são removidos; GIFs/animações ficam estáticos. JPEG, PNG, WebP, AVIF, GIF, TIFF, SVG e HEIC/HEIF são tratados pelo fluxo; BMP depende da conversão no navegador. Um arquivo corrompido, RAW proprietário ou formato sem decodificador ainda pode falhar. Não há como garantir literalmente qualquer arquivo como imagem.

O antigo bloqueio de 5 MiB sobre a foto original foi removido. Restam proteções técnicas contra arquivos gigantes: 50 MiB de entrada no servidor e 50 megapixels na decodificação do servidor. A compressão no navegador pode reduzir a foto antes de chegar ao backend. Fotos HEIC/TIFF podem não ter prévia no navegador antes de salvar, mas serão convertidas no backend quando suportadas.

## 11. Se algo não funcionar

- **Botão Google/Drive não aparece:** confirme as variáveis públicas no Render e o retorno de `/api/auth/google/config`; recarregue o frontend novo.
- **Origem não autorizada pelo Google:** compare a origem da barra de endereços com as origens JavaScript do cliente Web. Hash de preview diferente é outra origem.
- **Picker falha:** confirme as duas APIs habilitadas, a restrição de referenciador da chave e o número do mesmo projeto do client ID.
- **Erro de CORS:** confira `CORS_ORIGINS`, sem caminho nem barra final, e publique a configuração do Render.
- **Recuperação indisponível:** falta alguma variável `GMAIL_*`. O remetente precisa ter autorizado o cliente Gmail correspondente.
- **Código não chegou:** confira spam, o e-mail salvo na conta, os limites de envio e os logs do Render. A mensagem `Falha no envio da recuperação via Gmail` aponta para autorização/credenciais do remetente; reautorize se o token expirou ou foi revogado. Os logs não devem conter tokens nem o código.
- **Tabela/coluna inexistente:** confira se as migrações foram aplicadas ao mesmo banco que o Render utiliza.
- **Upload falha no Storage:** confira a chave privada no Render, o nome do bucket, permissão de leitura, aceitação de WebP, limite por arquivo e espaço disponível.
- **SVG/HEIC/arquivo inválido:** tente exportar a foto como JPEG caso o decodificador não reconheça o arquivo específico.

Os testes automatizados locais não enviam e-mail real e não alteram seu Supabase. A confirmação final de OAuth, entrega do código e Storage acontece após completar estes passos com suas credenciais.

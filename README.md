
# História - Bearer of Ash

A escuridão é apenas a luz que queimou por tempo demais... Por eras, os Towners guardaram a Candelária Celeste, um antigo altar forjado com metais de estrelas caídas. Ela era o elo entre o mundo humano e a essência luminosa dos antigos deuses - um símbolo da ordem e da pureza. Mas sob o brilho dourado da Candelária, existia um segredo esquecido: a chama original não era feita de luz... e sim de sombra viva. Você é um dos Sombras do Fulgor, uma alma banida que outrora serviu à Candelária antes que os Towners profanassem seu fogo, aprisionando-o em luz. 
Agora, desperto entre os mundos, você busca restaurar a verdadeira chama, reacendendo as Tochas da Ruína - artefatos antigos que alimentam a essência sombria do fogo original. Quando todas as tochas estiverem acesas, o círculo da Candelária se fechará e renascerá como o Foco das Sombras Eternas, consumindo toda a luz falsa que domina o mundo. 

## Objetivo do jogador

O jogador deve acender as quatro Tochas da Ruína em cada canto do Claustro (cenário) para que no altar (centro), a cada tocha acendida, uma vela seja acesa para completar o ritual. Os Towners, cegos pela devoção, tentarão impedir. Use seus dons sombrios para confundir seus inimigos e finalizar o trabalho. 

## Personagem principal

“O Portador da Cinza”, um ex-sacerdote que traiu os deuses da luz ao descobrir a origem verdadeira do fogo. Condenado a vagar entre mundos, agora carrega fragmentos da antiga chama dentro do próprio corpo. Cada tocha que reacende o torna mais humano - mas também mais monstruoso. 

## Cenário 

Claustro da Luz Silente, onde monges Towners realizam rituais para selar o fogo.

# Bearer of Ash (PlayCanvas)

Jogo de ação top-down desenvolvido para a PlayCanvas, criado inteiramente com scripts JavaScript (pc.createScript) no VS Code.

Este repositório suporta dois fluxos de trabalho:

Execução local apenas com a engine (sem PlayCanvas Editor): abrir index.html, que utiliza scripts/bootstrap.js para construir a cena e a interface em tempo de execução com texturas.

Fluxo com Editor (opcional): enviar scripts e imagens para um projeto PlayCanvas e configurar componentes/atributos no Editor.

## Estrutura de Pastas (local / VS Code)

Importe esses arquivos para seu projeto PlayCanvas (Assets → Upload). Para imagens, crie assets de Sprite (Animado quando necessário).

## Hierarquia de Cena

Se usar o fluxo com o editor, crie duas cenas no PlayCanvas:

Menu

Screen (Screen Space)

MenuPanel (Element: Group)

Title (Element: Text)

Buttons (Element: Button para cada) → Easy, Normal, Hard, Credits, Exit, Start

PausePanel (oculto)

HudPanel (oculto)

WinPanel (oculto)

LosePanel (oculto)

CreditsPanel (oculto)

UiManager (Entidade com Script: uiManager)

TinwoodGrove (Jogo)

Camera (Orthographic) olhando para baixo no eixo Y-

Background (Element: Image) usando images/map.jpg (esticado ou escalado para o mundo)

Player (Sprite, Collision opcional)

Script: playerController

Torches (sugerido 4)

Torch_01..04 (Sprite com 2 frames)

Script: torch

Altar (Sprite com 5 frames)

Script: altar

GameManager (Vazio)

Script: gameManager

EnemyPrefab (filho desativado com Sprite + Script enemyAI)

UI (Screen Space)

HudPanel (Element: Group)

TorchesText (Text)

DifficultyText (Text)

HintText (Text opcional)

Painéis de Pause/Win/Lose, se preferir também na cena do jogo

Script: uiManager (opcional na cena do jogo se não reutilizar a cena Menu)

Para o fluxo local apenas com a engine, scripts/bootstrap.js cria programaticamente uma hierarquia equivalente em tempo de execução e carrega texturas diretamente da pasta images/.

## Scripts 

playerController.js → na entidade Player

Movimento com WASD no plano XZ

Segurar E para acender uma tocha próxima

Animação de Sprite com 3 frames

enemyAI.js → em entidades Enemy (e EnemyPrefab)

Procura tochas acesas e as apaga

Opcionalmente persegue o jogador se estiver perto

torch.js → em cada entidade Torch

Gerencia estado aceso/apagado, acender/apagar

Emite eventos usados por GameManager/UI

altar.js → na entidade Altar

Mostra contagem de tochas acesas (frame 0..4) e dispara vitória

gameManager.js → em uma entidade GameManager

Controla tochas, spawn de inimigos, dificuldade, vitória/derrota

uiManager.js → na raiz da UI (Menu ou Jogo dependendo da configuração)

Botões e atualização do HUD, pause/resume, carregamento de cena

## Configuração de Componentes no Editor (opcional)

Geral

Use um layout 2D top-down com plano XZ; mantenha Y = 0 para entidades de jogo.

Camera → Orthographic (ajuste tamanho ao mundo). Aponte para (0, -1, 0), posição em torno de (0, 10, 0).

Player

Sprite Component: defina um Sprite com 3 frames (grade ou clips). O script usa sprite.frame para animar.

(Opcional) Collision (Capsule/Box) + Rigidbody (Kinematic) se quiser triggers; scripts também funcionam só com verificação de distância.

Script Component → adicionar playerController

moveSpeed ≈ 2.2

animFps = 10, frames = 3

interactionRadius = 1.5

gameManager = entidade GameManager

Torch (repetir por tocha)

Sprite Component: 2 frames (0=apagado, 1=aceso) OU Sprite com duas imagens.

Marque a entidade com a tag torch (script adiciona automaticamente se não existir).

Script Component → adicionar torch

startLit (se desejar começar acesa)

igniteTime ≈ 1.2s; extinguishTime depende da dificuldade (enemyAI substitui)

Altar

Sprite Component: 5 frames. O índice do frame igual ao número de tochas acesas (0..4).

Script Component → adicionar altar

Enemies

Crie uma entidade EnemyPrefab dentro de GameManager (desativada), com Sprite (3 frames) e Script enemyAI.

EnemyPrefab será clonado/gerado pelo GameManager.

GameManager

Script Component → adicionar gameManager

difficulty: Easy/Normal/Hard (substituído pela seleção do menu via localStorage)

player: entidade Player

altar: entidade Altar

uiManager: entidade UI (HUD do jogo)

enemyPrefab: filho EnemyPrefab (template desativado)

spawnPoints: adicione algumas entidades vazias no mapa como pontos de spawn

UI / Menu

Crie uma UI Screen Space com painéis Element: Group para Menu, HUD, Pause, Win, Lose, Credits.

Adicione Botões com componentes Element + Button; conecte ao uiManager via atributos.

Script Component → adicionar uiManager e vincular entidades de painel e textos.

## Fluxo de Jogo

Cena Menu carrega com uiManager exibindo MenuPanel.

Start → carrega cena TinwoodGrove; uiManager exibe HUD e envia game:resume.

Jogador explora e acende tochas com E; inimigos aparecem e tentam impedir.

Altar atualiza frames conforme tochas acesas; quando todas acesas e mantidas por um tempo, vitória.

Se for impedido/capturado, derrota.

Pause com ESC → Resume/Restart/Return.


## Notas

Execução local apenas com a engine:

Inicie um servidor web local na raiz do repositório e acesse http://localhost:PORT/ para carregar index.html.


## Fluxo com Editor:

Criar assets de Sprite e atribuir às entidades. Os scripts também suportam modo apenas textura via Render (atributos frameTextures, unlitTexture, litTexture).

A UI espera componentes Element; vincule via atributos no Editor.

# Demonstração

## Tela inicial do jogo, com informativo sobre movimentação do jogador:

<img width="712" height="406" alt="image" src="https://github.com/user-attachments/assets/d8e439ef-b2c2-4ae1-abe5-1a486de242f5" />

## Tela de Game Over - você foi capturado pelos Towners:

<img width="639" height="356" alt="image" src="https://github.com/user-attachments/assets/a5a8fa1a-15a3-40f5-87c9-a3b99b2b635b" />

## Tela de Vitória - você completou o ritual:

<img width="699" height="429" alt="image" src="https://github.com/user-attachments/assets/ed6dc375-5a83-4294-b7a2-68bdc466e126" />

## Acendendo tocha com barra de carregamento:

<img width="669" height="173" alt="image" src="https://github.com/user-attachments/assets/df9c99d2-a8be-4747-97d7-fa65c8da4949" />

## Indicativo de número de tochas acesas:

<img width="125" height="67" alt="image" src="https://github.com/user-attachments/assets/c8e78db6-39e0-4bc6-9bd7-7aae66dc54e6" />

## Perseguição com cone de visualização do inimigo:

<img width="276" height="298" alt="image" src="https://github.com/user-attachments/assets/4e804083-ebb5-4273-9f63-a04d84dda7e4" />

## Botão de pausa implementado:

<img width="113" height="62" alt="image" src="https://github.com/user-attachments/assets/f20855c1-1d46-453f-b7d0-dd230c849fc6" />

## Trilha sonora do jogo que pausa e retorna quando o jogo é pausado:

<img width="1365" height="629" alt="image" src="https://github.com/user-attachments/assets/a94d4291-f250-4014-88b2-dd2ce2fdc80f" />

## Elementos visuais, com colisão implementada, para enriquecimento do cenário:

<img width="290" height="397" alt="image" src="https://github.com/user-attachments/assets/fb11a020-de33-4bc5-8b59-be7fc9801bb5" />
<img width="155" height="492" alt="image" src="https://github.com/user-attachments/assets/4acbd6a2-071f-4bb2-a714-9644ed797fba" />

## Personagens de autoria própria, com sprite sheet implementado:

<img width="130" height="196" alt="image" src="https://github.com/user-attachments/assets/7b04f769-0cdb-4536-9b0c-eaba138c96f6" />
<img width="232" height="325" alt="image" src="https://github.com/user-attachments/assets/7e57feba-26a5-4beb-9247-2248e66a1902" />

## Altar alterado a cada vez que o personagem acende uma tocha:

<img width="357" height="220" alt="image" src="https://github.com/user-attachments/assets/bdc3af24-8c73-46a5-bc64-e6baa076403a" />
<img width="437" height="274" alt="image" src="https://github.com/user-attachments/assets/39f42c2f-05d0-4233-9d7e-0d8ce9d93092" />
<img width="442" height="280" alt="image" src="https://github.com/user-attachments/assets/985d1886-5698-4e5c-964c-0d94350f2663" />
<img width="379" height="237" alt="image" src="https://github.com/user-attachments/assets/fd7fcdba-fada-49ea-b0b7-f75092501990" />
<img width="356" height="230" alt="image" src="https://github.com/user-attachments/assets/a544466e-555e-4edf-acbb-d719b13f8e80" />

## Visual geral:

<img width="744" height="738" alt="image" src="https://github.com/user-attachments/assets/59aed533-33ca-40bf-a958-6c5e2675c7ba" />
<img width="750" height="759" alt="image" src="https://github.com/user-attachments/assets/56fd971e-8939-431e-a51f-729f0676f967" />










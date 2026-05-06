export type Theme = 'noty' | 'nyto'

export interface Track {
 id: string
 title: string
 artist: string
 genre: string
 audioUrl: string
 coverUrl?: string
 rank?: number
 lyrics?: string
}

export const FEATURED_TRACK: Track = {
 id: 'noty-grand-frere-faux',
 title: 'Grand Frere Faux',
 artist: 'Noty',
 genre: 'HyperPop / Cyberbung / Darkcore / French Core',
 audioUrl: '/tracks/Grand Frère Faux - Noty.mp3',
 coverUrl: '/visual/bannerSuno.png',
 rank: 1,
 lyrics: `
grand - grand - grand -
faux frère - frère - frère -
toxique - toxique - tox- tox- tox-

Tu parles fort - mais t'es vide en vrai
Tu joues l'mentor - mais t'es cassé de près
Tu pointes du doigt comme un putain d'juge
Mais ton reflet fuit quand tu bouges

Tu penses m'éduqué - me dire "sois comme ça"
Mais t'as jamais su te gérer toi
Tu donnes des leçons en carton plein
Alors qu't'es même pas droit dans ton chemin

Tu veux m'tenir - tirer les ficelles
Mais t'es déjà mort dans ton logiciel
Tu fais le sage, posture parfaite
Mais j'vois la merde sous ton headset

T'as l'air clean de loin
Mais t'es corrompu à l'intérieur
tu fais le - fais le - fais le grand
moi j'vois - j'vois - j'vois l'erreur

RELATION TOXIQUE - TOXIQUE
(tox - tox - toxique)
Tu t'prends pour mon grand frère
Mais ta vie s'est qu'un crash test

RELATION TOXIQUE - TOXIQUE
(re-re-relation) (tox - tox - toxique)
Tu fais le roi sur le bitume
Mais t'es vide quand t'éteins l'écran

RELATION TOXIQUE - TOXIQUE
(toxique - toxique - toxique)
Tu veux m'faire la morale?
T'as même pas sauvé ta version

RELATION TOXIQUE - TOXIQUE
(frère - frère - faux frère)
T'es un faux guide, faux repère
Juste un bug dans ma direction

Tu veux mon silence, mon respect?
Commence déjà par t'respecter
Tu caches tes failles sous du bruit
Mais j'les entends même dans la nuit

J'ai vu les cracks dans ton décor
Les promesses mortes, tes lignes de code en tort
Un mauvais patch dans mon chemin
T'es pas un guide - t'es juste un glitch humain

Tu veux contrôler - donner le ton
Mais t'es juste perdu sans horizon
tu fais le fort - fort - fort -
mais s'qu'est plus fort que toi
c'est ton égo

T'as l'air solide de loin
Mais t'es fracturé de l'intérieur
grand - grand - grand -
juste un rôle - juste une erreur

RELATION TOXIQUE - TOXIQUE
(tox - tox - toxique)
Tu t'prends pour mon grand frère
Mais ta vie c'est qu'un crash test

RELATION TOXIQUE - TOXIQUE
(re-re-relation)
Tu fais le roi sur le bitume
Mais t'es vide quand t'éteins l'écran

RELATION TOXIQUE - TOXIQUE
(toxique - toxique - toxique)
Tu veux m'faire la morale?
T'as même pas sauvé ta version

RELATION TOXIQUE - TOXIQUE
(frère - frère - faux frère)
T'es un faux guide, faux repère
Juste un bug dans ma direction

T'as prétendu m'apporter la lumière
Mais t'es resté enfumé par ta weed
T'as jamais changé, t'es un drogué aigri
Qui pense évolué, mais t'es toujours le même soupir

Même pas foutu de tenir une relation,
(toxique - toxique - toxique)
T'as zéro respect, mat'cho et tu crois prendre la bonne direction
(toxique - toxique - toxique)
Tu joues les incel', t'as juste la trouille tes qu'un trouffion
(tox - tox- toxique)

RELATION TOXIQUE - TOXIQUE
(tox - tox - tox - toxique)
Tu t'prends pour mon grand frère
Mais t'es même pas stable toi-même

RELATION TOXIQUE - TOXIQUE
(relation - relation - toxique)
Ta fais le roi sur le pavé
Sombre merde j'aurais jamais du t'écouté

RELATION TOXIQUE - TOXIQUE
(toxique - toxique - toxique)
T'as voulu m'faire la morale
Ma parole et mon âme, frère c'est fi-ni

RELATION TOXIQUE - TOXIQUE
(frère - frère - faux - faux - faux)
J'te laisse seul avec ton rôle
Ton reflet qui brûle
j'en peu plu

regarde - regarde - regarde-toi...
même ton miroir...
veut... veut plu... veut plu de toi...`,
}

export const TOP_TRACKS: Track[] = [
 FEATURED_TRACK,
 {
 id: 'noty-double-face-exe',
 title: 'Double Face.exe',
 artist: 'Noty',
 genre: 'HyperPop / Darkcore',
 audioUrl: '/tracks/double-face.exe-noty-v2.mp3',
 coverUrl: '/visual/Double-Face.exe–Noty-v2.jpg',
 rank: 2,
 lyrics: `(Intro)
Voix pitchée, cœur glitché
J'change de peau pour un skin pixelisé
Miroir miroir, qui je suis? (vraiment)
Deux versions d'moi qui s'craquent dans la nuit

(Couplet 1)
J'cours après la thune, multi-threads pour une vie
De jour en costard, j'm'exprime au féminin
J'fake des sourires, j'leur vends une illusion
Dans ma tête ça crame, court-circuit d'identité, pression

Mascara qui bave, vérité qui déborde
J'suis un bug vivant dans leur putain d'décor
J'code mon reflet comme une erreur système
Trop vrai pour eux, trop faux pour moi-même

Double face comme un cahier noir sous la veste
J'écris des noms mais c'est moi que je teste
Ryuk s'fout d'ma gueule dans un coin d'ma tête
J'joue avec mes masques, ouais, roulette russe nette

J'empile les jobs, vendeuse, freelance, fantôme
J'bouffe du stress, j'dors plus, cerveau en chrome
Persévérante? Ou juste accro au chaos?
J'avance en talons dans un monde de salauds

(Refrain)
J'flip entre deux reflets, j'tape du pied
Un mec dans l'ombre, une meuf sous néons violet
Hyperpop sale, frenchcore dans l'crâne
J'crache mon vrai moi, brut, sans filtre, sans vanne

J'flip entre deux reflets, j'vrille un peu
Entre ce qu'ils veulent et c'que j'cache dans mes yeux
Plus d'comédie, j'arrache le masque
Même si ça choque, même si ça clashe

(Post-refrain / Drop)
Voix saturée, j'leur pète les oreilles
J'suis pas clean, j'suis juste réel(le)
J'leur dois rien, qu'ils aillent se faire voir
Dans ce son-là, j'récupère mon pouvoir

(Outro)
Deux vies, un corps, et trop d'pensées noires
Mais j'brille quand même dans le bordel du miroir
J'suis pas stable, ouais, et alors?
C'est dans l'chaos que j'crée de l'or`,
 },
 {
 id: 'noty-vapestore',
 title: 'VapeStore',
 artist: 'NoTy',
 genre: 'Cyberpunk / HyperPop',
 audioUrl: '/tracks/VapeStore-NoTy.mp3',
 coverUrl: '/visual/splitFaceNytoNoty.jpg',
 rank: 3,
 lyrics: `Lundi soir, plutôt levée
Encore une putain de mi-journée
Le premier entre-deux, air paumé
Ma vape marche plus, énervée
Fais-moi voir ce qu'on n'avait pas chargé
Chargé
Concerté, monsieur veut son juice
Il coupe comme d'hab
C'est sur lequel tu veux la même qu'une autre mais en plus exceptionnel
J'explique trois fois, tu regardes ailleurs
Comme si changer une résistance demandait un ingénieur

Je fais la caisse, je fais son plan
Que tout ça reste parfaitement normal
Les mêmes questions, les mêmes gens
Le même bordel, toujours banal
Je fais la caisse, je fais son plan
Que tout ça reste parfaitement normal
Les mêmes questions, les mêmes gens
Le même bordel, toujours banal
Le temps qui fuit, la bœuf qui crame
Les drames reviennent calmement
Moi je répare tout, les yeux fuyants
Putain, il serait temps que je foute le camp

Tu tires trop fort, tu fais le surprix
C'est normal si ça chauffe ici
Tu veux moins cher, mais mieux que tout
Le luxe du pauvre version Coca-Zito
Tu bloques la file avec tes hésitations
Je suis pas addict, juste en répétition
Ça fait six mois, tu viens chaque soir
Juste pour tester le même putain de fumoir

Je fais la caisse, je fais son plan
Que tout ça reste parfaitement normal
Les mêmes questions, les mêmes gens
Le même bordel, toujours banal
Le temps qui fuit, la bœuf qui crame
Les drames reviennent calmement
Moi je répare tout, les yeux fuyants
Putain, il serait temps que je foute le camp

Le manager veut du chiffre, du panier moyen
Rajoute un liquide, une puff, vas-y pousse-les bien
Mais faut pas croire ma vie c'est ton shop de cons
Moi je vois des gens, pas des tickets de caisse à rallonge
Fils naïf, ouais peut-être souvent
Mais moi je reste humain là-dedans
Leur souffle, leur clope, leur santé
Ça se monnaie pas pour gonfler ton putain de panier

Je fais la caisse, je fais son plan
Et je garde encore un peu du mien
Les mêmes questions, les mêmes gens
Et demain ça recommence au matin
Le temps qui fuit, la bœuf qui crame
Le boss veut toujours plus d'argent
Moi je répare tout, les yeux fuyants
Putain, il serait temps que je foute le camp

`,
 },
 {
 id: 'noty-reveil-interdit',
 title: 'Reveil Interdit',
 artist: 'NoTy',
 genre: 'Darkcore / HyperPop',
 audioUrl: '/tracks/Réveil-Interdit-NoTy.mp3',
 coverUrl: '/visual/landscapeNytoNoty.jpg',
 rank: 4,
 lyrics: `Borrrdeeel...
Je sais trop bien ce qui m'arrive...
J'ai voulu rêver en lucide...
Et maintenant j'suis là...
Éveillé, mais paralysé...

Je te regarde
Tu me regardes
Pourquoi tes yeux
Sont au plafond?

Je monte les étages
Je cours vers la voix
Mais la porte de ma chambre
Se referme sur moi

J'arrive au réveil
Je tombe plus bas
Chaque souffle me ramène
Là où je n'vais pas

Je suis bloqué
Je deviens fou
Ces profondeurs
N'ont pas d'issue

Ce n'est plus un rêve
Qui m'engloutit encore
C'est le cauchemar qui passe
De l'ombre à mon corps

Pourquoi ce sourire?
Pourquoi ce décor?
Me voilà prisonnier
D'un réveil qui dévore

C'est désormais clair
Je perds la raison
J'ai voulu contrôler la nuit
J'ai perdu le fil du nom

Les monstres autour
Rampent et m'invoquent
Chaque mur se déforme
Chaque seconde se disloque

Je sais que je dors
Je sais que je vois
Mais mes bras ne répondent plus
Je n'bouge pas

Je flotte au plafond
Je vois mon corps
Cloué sur le matelas
Les yeux grands ouverts

Je suis bloqué
Je deviens fou
Ces profondeurs
N'ont pas d'issue

Je cours dans ma tête
Vers la lumière
Mais dans la chambre réelle
Le noir me serre

Pourquoi ce sourire?
Pourquoi cette nuit?
Pourquoi mes monstres
Respirent ici?

Je sens ta présence
Sortie de mes pensées
Guide-moi
Ou laisse-moi tomber

Mon âme en lambeaux
Cherche à distinguer
Là où finit le rêve
Et où le vrai s'est brisé

Tes griffes sur ma gorge
N'existent pas
Pourtant chaque seconde
M'arrache les bras

Je compte jusqu'à dix
Je casse le sort
Mais à chaque "je me réveille"
Tu te tiens plus fort

sourire... sourire... sourire...
réveille-toi... réveille-toi... réveille-toi...
bouge... bouge... bouge...
je ne peux pas... je ne peux pas...

Laisse la lumière
Me traverser
Laisse ma peur
Se consumer

Même figé
Dans ce corps noir
Je peux encore
Te voir sans croire

Un battement
Une lueur
Je comprends enfin
Qui nourrit la terreur

J'ouvre les yeux
Mais rien ne s'efface
Je rêve lucide
Et l'horreur prend place

Retrouver mon cœur...
Sans bouger d'un millimètre...
Retrouver mon cœur...
Réveillé, mais prisonnier...
Les monstres sont là...
Dans ma réalité...`,
 },
 {
 id: 'noty-oseilles',
 title: 'Oseilles',
 artist: 'Noty',
 genre: 'HyperPop / French Core',
 audioUrl: '/tracks/Oseilles-Noty.mp3',
 coverUrl: '/visual/notyBackgroundWhite.png',
 rank: 5,
 lyrics: `J'ai besoin d'oseille, pas d'illumination.
Ma vocation? survivre avec du son.

Je fais des tracks avec l'IA, oui madame,
parce que mon loyer s'en bat les couilles de mon âme.
Le romantisme c'est cool, mais ça paie pas l'EDF,
donc je compresse mes névroses et j'exporte en WAV.

J'me prends pour une artiste, j'me vends comme une startup,
j'fais la meuf profonde puis j'check "solde insuff".
Auto-parodie premium, je connais le tarif:
un peu de vérité sale, un hook addictif.

Gintoki sans charisme, Onizuka sans école,
je donne des leçons de vie avec un découvert qui colle.
Le monde est absurde? parfait, j'suis à l'aise,
j'fais danser ma détresse en bassline obèse.

Si toi aussi t'es broke, fais pas l'innocent.
On est plein à sourire avec le compte en sang.

J'ai besoin d'thunes, hoche la tête.
J'ai besoin d'thunes, tape du pied.
J'fais des bangers pour payer mes dettes,
si t'es dans la merde, viens t'ambiancer.

J'ai besoin d'thunes, hoche la tête.
J'ai besoin d'thunes, tape du pied.
On vend nos drames en version fête,
et ça marche - putain, quel métier.

thunes... thunes...
tête... pied...
lol... crise...
danse... paye...

J'ai arrêté d'attendre la "bonne opportunité",
j'ai pris la honte, la sueur, puis j'ai monétisé.
Le "vrai art" me juge? qu'il paie mes factures,
sinon qu'il ferme sa bouche et admire la structure.

Je fais du sale propre, du cynisme chantant,
des refrains qui brillent sur des nerfs grinçants.
Je suis lucide: tout l'monde vend quelque chose,
moi je vends mes galères en néons roses.

GTO dans la posture, Gintama dans l'esprit,
je transforme mes échecs en chorégraphies.
Pas de morale finale, pas de conte de fées,
juste une meuf qui veut bouffer... et rester syncée.

J'voulais "vivre de ma passion", phrase de TED Talk.
J'ai eu "fais du contenu", "poste plus", "fais du stock".
Donc je l'ai fait.
Et maintenant j'assume:
si le système est une blague,
j'suis le punchline en costume.

J'ai besoin d'thunes, hoche la tête.
J'ai besoin d'thunes, tape du pied.
J'fais des bangers pour payer mes dettes,
si t'es dans la merde, viens t'ambiancer.

J'ai besoin d'thunes, hoche la tête.
J'ai besoin d'thunes, tape du pied.
On vend nos drames en version fête,
et ça marche - putain, quel métier.

Pas sainte.
Pas stable.
Mais rentable.
Et c'est déjà énorme.`,
 },
 {
 id: 'noty-oseilles-geek',
 title: 'Oseilles (Geek version)',
 artist: 'Noty',
 genre: 'HyperPop / Electro',
 audioUrl: '/tracks/Oseilles(Geek_version)-Noty.mp3',
 coverUrl: '/visual/splitFaceNytoNoty.jpg',
 rank: 6,
 lyrics: `J'ai besoin d'oseille...
pas d'élévation.

Ma passion?
survivre en exportation.

Je fais des tracks avec l'IA, ouais ma gueule,
mon proprio veut du cash, pas mes séquelles.
Le cœur en vrac, le compte dans le rouge,
j'fous mes angoisses en WAV puis ça bouge.

J'me prends pour une artiste, j'me vends startup,
story de merde puis "solde insuff".
Un hook sale, deux vérités,
un refrain crade prêt à monétiser.

Comme Gintoki Sakata sans thune ni sommeil,
je cache la dèche sous un sourire vermeil.
Fraise au lait dans l'âme, factures plein les poches,
je ris comme une conne pendant qu'la vie me fauche.

Comme Eikichi Onizuka, costard de travers,
j'balance des leçons avec l'air d'un pervers.
Le monde est une blague? parfait, ça m'arrange,
j'fais danser ma chute pendant que le kick mange.

Si toi aussi t'es broke, cache pas tes dents,
on sourit tous avec le compte en sang.

J'ai besoin d'thunes - bouge la tête.
J'ai besoin d'thunes - tape du pied.
Je fais des bangers pour solder mes dettes,
si t'es au fond, viens t'ambiancer.

J'ai besoin d'thunes - bouge la tête.
J'ai besoin d'thunes - tape du pied.
On vend nos drames en version fête,
et ça stream - hoche la tête.

J'ai besoin d'thunes - tape du pied.
J'ai besoin d'thunes - bouge la tête.

J'ai plus le temps d'attendre un putain d'miracle,
j'ai pris ma honte, j'en ai fait un spectacle.
Le "vrai art" parle? qu'il paie l'EDF,
sinon qu'il ferme sa gueule et mate le relief.

Je fais du sale propre, du cynisme chanté,
des néons roses sur des nerfs éclatés.
Tout le monde vend son cul ou son image,
moi j'vends mes galères en stroboscopage.

Eikichi Onizuka dans la posture, les poches à l'envers,
je donne des leçons même dans la galère.
Gintoki Sakata dans l'esprit, loser magnifique,
je transforme mes échecs en tubes toxiques.

J'crache mes nuits sur le kick qui cogne,
j'fais danser la honte pendant qu'ça saigne et qu'ça sonne.

J'voulais vivre de ma passion...
poste LinkedIn, DEAD Talk, illusion.

On m'a dit:
"poste plus"
"sois visible"
"fais du contenu"
"sois rentable"

Alors j'ai fait.

Et maintenant j'assume:

si le système est une blague,
j'suis le rire qui brûle la salle.

J'ai besoin d'thunes - hurle plus fort.
J'ai besoin d'thunes - détruit le sol.
Je fais des hymnes avec mes remords,
pour transformer la casse en or.

J'ai besoin d'thunes - bouge la tête.
J'ai besoin d'thunes - tape du pied.
On vend nos drames en version fête,
viens on réchauffe la planète.

J'ai besoin d'thunes - hurle plus fort.
J'ai besoin d'thunes - détruit le sol.
J'ai besoin d'thunes - bouge la tête.
J'ai besoin d'thunes - tape du pied.

Un jour ça finira par payer, payer, payer.

Pas sainte.
Pas stable.
Mais rentable.
Pas simple.`,
 },
 {
 id: 'noty-vendeur-de-nuages',
 title: 'Vendeur de nuages',
 artist: 'Noty & Nyto',
 genre: 'Cyberbung / Electro',
 audioUrl: '/tracks/Vendeur_de_nuages-Noty_&_Nyto.mp3',
 coverUrl: '/visual/landscapeNytoNoty.jpg',
 rank: 7,
 lyrics: `Tu rentres
Tu tousses
Tu filmes ta toux
Tu demandes "c'est lequel qui fait pas de fumée du tout?"
T'as lu trois posts
T'es devenu expert santé
Tu veux du goût gâteau
Mais "surtout pas m'empoisonner"

Tu poses dix questions
Écoute zéro phrase
Tu compares la vitrine à une pharmacie de base
"Je veux pareil que lui
Mais en moins cher et mieux"
Tu lis même pas l'affiche juste devant tes yeux

Je vends des nuages
Pas des neurones
Des petites lumières pour grandes personnes
Tu tires
Tu tires
Tu comprends rien
Et tu reviens demain
Et tu reviens demain
Je vends des nuages
Pas des réponses
Tu cherches la vérité dans les bonbons
Tu tousses
Tu pleures
Tu cries au scandale
Et tu reviens pareil
Carte bancaire en cavale (hey!)

"C'est normal si ça fait chaud quand je respire fort?"
Tu demandes en tirant comme si c'était du sport
"C'est écrit dessus
Regarde" - tu regardes le sol
Tu veux le mode d'emploi
Mais en version alcool

Tu payes en pièces jaunes
Tu bloques la file
Tu veux la saveur "mûre" mais "pas trop fruit de ville"
Tu me dis "j'suis pas addict
C'est juste pour tester"
Ça fait six mois que tu viens "juste pour regarder"

Je vends des nuages
Pas des neurones
Des petites lumières pour grandes personnes
Tu tires
Tu tires
Tu comprends rien
Et tu reviens demain
Et tu reviens demain
Je vends des nuages
Pas des réponses
Tu cherches la vérité dans les bonbons
Tu tousses
Tu pleures
Tu cries au scandale
Et tu reviens pareil
Carte bancaire en cavale (oh ouais)

Tu veux la vie simple dans un petit flacon
Le monde en version "fruit rouge" pour la distraction
Tu me prends pour ton oncle
Ton médecin
Ton psy
Et tu râles quand je dis juste "lis ce qui est écrit"

Je vends des nuages
Pas des neurones
Des petites lumières pour grandes personnes
Tu tires
Tu tires
Tu comprends rien
Et tu reviens demain
Et tu reviens demain
Je vends des nuages
Pas des réponses
Tu cherches la vérité dans les bonbons
Tu tousses
Tu pleures
Tu cries au scandale
Et tu reviens pareil
Carte bancaire en cavale`,
 },
 {
 id: 'noty-transmission',
 title: 'Transmission',
 artist: 'Noty',
 genre: 'Darkcore / French Core',
 audioUrl: '/tracks/Transmission-Noty.mp3',
 coverUrl: '/visual/notyBackgroundWhite.png',
 rank: 8,
 lyrics: `Je suis la p'tite dernière.
Pas votre messagerie.
Deux frères. Dix ans de vide.
Moi, au milieu du bruit.

Vous dites rien en direct.
Vous passez par moi, discret.
"Il va bien?" sans dire son nom.
"Ne lui dis pas" même chanson.

L'un est feu, l'autre est glace.
L'un explose, l'autre s'efface.
Même orgueil, même poison.
Même sang, même prison.

Drama puéril, fracture d'adulte.
Vous appelez ça des principes.
Moi, j'appelle ça de la fuite.
Et j'ramasse vos ruines.

J'ai tout tenté, j'ai tout pris.
Parler, calmer, recoudre, tenir.
Rien bouge, rien guérit.
Vos egos bouffent tout ici.

PARLEZ-VOUS. SANS MOI.
VOS FIERTÉS MON CRAMÉ.
MÊME SANG. MÊME TORT.
OU JE COUPE NET, COUPE NET.

sans moi... sans moi...
tout crame... tout crame...
même sang... même tort...
encore... encore...

Vos filles ont cinq et six ans.
Elles se sont vues une fois.
Une seule fois en six ans.
Et vous vivez avec ça?

Elles jouent sans vos rancunes.
Elles rient sans vos versions.
Vous, vous gardez la haine.
Elles paieront l'addition.

Quand elles diront "pourquoi?"
Vous répondrez quoi, sérieux?
"On était trop fiers"?
"On était trop cons"?

Je suis pas votre facteur.
Je suis pas votre alibi.
Je suis votre sœur.
Et j'en ai fini.

PARLEZ-VOUS. SANS MOI.
VOS FIERTÉS MON CRAMÉ.
MÊME SANG. MÊME TORT.
OU JE COUPE NET, COUPE NET.

Un appel. Deux minutes.
C'était réglable, en vrai.
Mais non, faut garder la pose,
faut garder la guerre, parfait.

Moi, j'peux plus porter vos statues.
Vos casseroles me tuent.

PARLEZ-VOUS, PUTAIN.
PARLEZ-VOUS, PUTAIN.
PENSEZ AUX GOSSES. PAS À VOUS (PAS À VOUS).
AVEC VOS ÉCHEC.
ELLES FERONT LES COMPTES.

plus de relais.
plus de "dis-lui".
vos filles grandissent.
vous allez prendre la facture.`,
 },
 {
 id: 'noty-reality-vap-shop',
 title: "Reality Vap' Shop",
 artist: 'Noty',
 genre: 'HyperPop / Cybercore',
 audioUrl: "/tracks/Reality-Vap'-Shop-Noty.mp3",
 coverUrl: '/visual/splitFaceNytoNoty.jpg',
 rank: 9,
 lyrics: `Bienvenue au vape shop, bonjour, qu'est-ce qu'il vous faut?
Non, j'vends pas vos clopes.
Mais j'peu vous aider à arrêter (diminuer).

Huit heures du mat', j'ouvre avec mes cernes sous les yeux,
le manager veut du chiffre, du sourire et du mieux.
Premier client qui rentre, haleine cendrier du soir:
"vous avez des Marlboro?" - va bien te faire mon bobo.

J'vends des résistances, du liquide, du sel de nico' ou des pods,
pas tes Gitanes froissées ni ton vieux paquet de clopes.
Mais faut rester polie, "service premium", ma belle,
même quand le monde entier te prend pour une poubelle.

Le boss veut du trois mill', surtout pas trop chargé,
"moins d'nicotine, ils reviennent, faut les faire consommer" (rend les accro' accro')..
Il dit ça comme un putain de gourou du panier moyen,
moi j'vois juste des gens qui galèrent à tenir avec leurs moyens.

"Fais monter les tickets."
"Pousse les accessoires."
J'vends des putains de rêves
dans un rayon miroir.

J'suis pas un bureau d'tabac - non, nan, nan,
arrête de m'demander ton poison.
J'vends des nuages goût fraise et melon,
pas ton cancer en promotion.

Le boss veut plus, plus, plus de ventes,
moins d'nico, plus d'attente.
J'garde mon âme, lui son pourcentage,
quelle belle pute, sont management.

"Madame, le six milli' ça m'fait plus rien du tout."
Bah oui connard, on t'a vendu du vent surtout.
On baisse les doses pour gonfler les passages,
et moi j'dois sourire pendant l'enfumage.

J'leur propose du dix du vingt, du vrai, du cohérent,
mais derrière on m'dit: "faut penser rendement".
Mon éthique prend des baffes en caisse numéro deux,
pendant qu'le boss compte ses primes avec les yeux heureux.

Une gamine en sevrage tremble devant les saveurs,
elle veut juste décrocher sans y laisser son cœur.
Merci les JNR, demoiselle n'a jamais fumer.
Désormais accro c'est mon job de la sevré.
Et moi j'dois lui mentir pour la marge du trimestre? (bande de bâtards)
Putain, ça m'donne envie d'crever la caisse en plexi, frère.

Kawaii smile, mascara qui coule,
dans la réserve je ravale la houle.
Licorne rose, goût barbe à papa,
capitalisme en habit de chat.

J'suis pas un bureau d'tabac - merde, comprends,
j'vends du sevrage, pas des morts à crédit sur vingt ans.
Le boss veut des stats, des ventes, du rendement,
moi j'veux juste dormir moralement.

Plus de ventes, plus de pods,
plus de clients qu'on reload.
Moins de nicotine, pour plus de retours,
Satisfaction client aligné au rendement,
Ras l'cul j'ai fait l'tours.

Bonne journée, à votre services.
À demain.`,
 },
 {
 id: 'noty-presentation',
 title: 'Presentation',
 artist: 'Noty',
 genre: 'Cyberpunk / Intro',
 audioUrl: '/tracks/Presentation-Noty.mp3',
 coverUrl: '/visual/landscapeNytoNoty.jpg',
 rank: 10,
 lyrics: `Badge bip, bpm qui grimpe,
8h59, cœur qui s'crinque.
Je rentre dans la case en pixels violets acides,
je laisse mon sourire glitché dans le vestiaire, liquide.

Je m'appelle Noty, mi-temps sous néons,
quatre heures à vendre ma politesse en promotion.
"Bonne journée", "bien sûr", "avec plaisir",
j'ai des scripts dans la tête pendant qu'on me voit servir.

Le planning tient debout avec du scotch et du calme,
moi pareil - mascara net, système en alarme.
J'empile des "oui" propres dans un décor bancal,
et je compte en silence ce que vaut une heure morale.

Le soir je redeviens moi: terminal, café noir,
je facture du code utile à des gens qui veulent y croire.
Ça paie des morceaux de mois, pas encore la sortie,
mais chaque ticket fermé me rend un peu d'oxygène ici.

J'ai deux agendas,
un pour survivre, un pour ne pas me trahir.
Je fais la navette entre "faut payer"
et "faut partir".

Je tape du pied devant le bureau,
je tape du pied derrière le comptoir.
Un contrat pour l'URSSAF,
un contrat pour l'espoir.

Je tape du pied, je reste droite,
même quand le décor me vend en pièces.
J'ai pas encore la clé complète,
mais j'ai déjà la porte en tête.

Le CDI mi-temps? oui, c'est stable sur le papier.
Comme une chaise cassée: tu t'assois, faut pas bouger.
On m'appelle "ressource", ça sonne presque humain,
je réponds "présente" avec les poings dans les poches, très bien.

En freelance, ça tourne - pas assez pour larguer le quai,
mais assez pour sentir que mon nom peut exister.
Je prends les missions courtes, les nuits longues, les délais sales,
je livre en pixel propre pendant que l'aube me décale.

L'IA fait le sale boulot quand il faut vider la pile,
moi je garde le nerf, l'angle, le style.
Si le marché veut du rapide, parfait, j'ai la cadence,
je laisse à la machine la sueur, je garde la sentence.

On me dit "patiente",
comme on dit "ferme-la" avec des gants.
Je hoche la tête,
et j'écris ma sortie dedans.

Je tape du pied devant le bureau,
je tape du pied derrière le comptoir.
Un contrat pour l'URSSAF,
un contrat pour l'espoir.

Je tape du pied, je reste droite,
même quand le décor me vend en pièces.
J'ai pas encore la clé complète,
mais j'ai déjà la porte en tête.

Je fais "oui" le jour.
Je fais "mieux" la nuit.
Ils pensent que je tiens grâce au poste.
Je tiens malgré lui.

J'ai appris à coder entre deux "bonjour",
à négocier mon futur entre deux tickets de caisse.
C'est pas un miracle.
C'est une évasion lente.

mi-temps... mi-temps...
plein d'heures... plein d'ombres...
pas encore... pas loin...
Noty... compile... sort.

Je tape du pied devant le bureau,
je tape du pied derrière le comptoir.
Je paie le présent en heures grises,
je finance mon départ.

Je tape du pied, je souris net,
pas pour ce monde-là - pour l'après.
Je suis pas libre à temps plein,
mais je le deviens en secret.

Demain je badge encore.
Demain je code encore.
Un jour les deux colonnes ne feront plus qu'une.
Et ce jour-là, je pointerai sortie.`,
 },
]

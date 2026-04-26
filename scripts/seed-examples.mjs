// 為每個 topic 塞 4 個代表性 Steam 遊戲（appid + name）
// 使用：node scripts/seed-examples.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PATH = resolve('src/lib/data/genres.json');

/** topic.id → [{appid, name}, ...] (各 4 個) */
const E = {
  // === 視角 ===
  'tag-第一人稱': [
    { appid: 220, name: 'Half-Life 2' },
    { appid: 620, name: 'Portal 2' },
    { appid: 782330, name: 'DOOM Eternal' },
    { appid: 546560, name: 'Half-Life: Alyx' }
  ],
  'tag-第三人稱': [
    { appid: 271590, name: 'Grand Theft Auto V' },
    { appid: 292030, name: 'The Witcher 3' },
    { appid: 374320, name: 'Dark Souls III' },
    { appid: 2050650, name: 'Resident Evil 4' }
  ],
  'tag-俯視---等角': [
    { appid: 1145360, name: 'Hades' },
    { appid: 632470, name: 'Disco Elysium' },
    { appid: 435150, name: "Divinity: Original Sin 2" },
    { appid: 291650, name: 'Pillars of Eternity' }
  ],
  'tag-橫向---2d': [
    { appid: 367520, name: 'Hollow Knight' },
    { appid: 504230, name: 'Celeste' },
    { appid: 105600, name: 'Terraria' },
    { appid: 268910, name: 'Cuphead' }
  ],
  'tag-3d': [
    { appid: 1245620, name: 'Elden Ring' },
    { appid: 1091500, name: 'Cyberpunk 2077' },
    { appid: 1593500, name: 'God of War' },
    { appid: 1174180, name: 'Red Dead Redemption 2' }
  ],
  'tag-假-3d': [
    { appid: 921570, name: 'Octopath Traveler' },
    { appid: 219740, name: "Don't Starve" },
    { appid: 107100, name: 'Bastion' },
    { appid: 108600, name: 'Project Zomboid' }
  ],
  'tag-vr': [
    { appid: 546560, name: 'Half-Life: Alyx' },
    { appid: 620980, name: 'Beat Saber' },
    { appid: 823500, name: 'Boneworks' },
    { appid: 450390, name: 'The Lab' }
  ],
  'tag-分割畫面': [
    { appid: 1426210, name: 'It Takes Two' },
    { appid: 1222700, name: 'A Way Out' },
    { appid: 728880, name: 'Overcooked! 2' },
    { appid: 268910, name: 'Cuphead' }
  ],

  // === 玩法 ===
  'tag-動作': [
    { appid: 601150, name: 'Devil May Cry 5' },
    { appid: 814380, name: 'Sekiro: Shadows Die Twice' },
    { appid: 524220, name: 'NieR:Automata' },
    { appid: 460790, name: 'Bayonetta' }
  ],
  'tag-冒險': [
    { appid: 203160, name: 'Tomb Raider' },
    { appid: 752590, name: "A Plague Tale: Innocence" },
    { appid: 1659420, name: 'UNCHARTED: Legacy of Thieves' },
    { appid: 319630, name: 'Life is Strange' }
  ],
  'tag-戰鬥': [
    { appid: 814380, name: 'Sekiro: Shadows Die Twice' },
    { appid: 304390, name: 'For Honor' },
    { appid: 1778820, name: 'Tekken 8' },
    { appid: 1364780, name: 'Street Fighter 6' }
  ],
  'tag-射擊': [
    { appid: 730, name: 'Counter-Strike 2' },
    { appid: 782330, name: 'DOOM Eternal' },
    { appid: 1172470, name: 'Apex Legends' },
    { appid: 397540, name: 'Borderlands 3' }
  ],
  'tag-潛行---犯罪': [
    { appid: 1659040, name: 'HITMAN 3' },
    { appid: 403640, name: 'Dishonored 2' },
    { appid: 218620, name: 'PAYDAY 2' },
    { appid: 214560, name: 'Mark of the Ninja' }
  ],
  'tag-角色扮演': [
    { appid: 489830, name: 'The Elder Scrolls V: Skyrim Special Edition' },
    { appid: 292030, name: 'The Witcher 3' },
    { appid: 1687950, name: 'Persona 5 Royal' },
    { appid: 1328670, name: 'Mass Effect Legendary Edition' }
  ],
  'tag-策略': [
    { appid: 289070, name: "Sid Meier's Civilization VI" },
    { appid: 1142710, name: 'Total War: WARHAMMER III' },
    { appid: 281990, name: 'Stellaris' },
    { appid: 1158310, name: 'Crusader Kings III' }
  ],
  'tag-戰術': [
    { appid: 268500, name: 'XCOM 2' },
    { appid: 590380, name: 'Into the Breach' },
    { appid: 607050, name: 'Wargroove' },
    { appid: 637090, name: 'BATTLETECH' }
  ],
  'tag-模擬': [
    { appid: 1222670, name: 'The Sims 4' },
    { appid: 1250410, name: 'Microsoft Flight Simulator' },
    { appid: 255710, name: 'Cities: Skylines' },
    { appid: 220200, name: 'Kerbal Space Program' }
  ],
  'tag-經營---管理': [
    { appid: 255710, name: 'Cities: Skylines' },
    { appid: 294100, name: 'RimWorld' },
    { appid: 535930, name: 'Two Point Hospital' },
    { appid: 323190, name: 'Frostpunk' }
  ],
  'tag-農場---田園': [
    { appid: 413150, name: 'Stardew Valley' },
    { appid: 1248130, name: 'Farming Simulator 22' },
    { appid: 666140, name: 'My Time at Portia' },
    { appid: 1158160, name: 'Coral Island' }
  ],
  'tag-載具---競速': [
    { appid: 1551360, name: 'Forza Horizon 5' },
    { appid: 1546970, name: 'F1 22' },
    { appid: 690790, name: 'DiRT Rally 2.0' },
    { appid: 1222680, name: 'Need for Speed Heat' }
  ],
  'tag-解謎---邏輯': [
    { appid: 620, name: 'Portal 2' },
    { appid: 210970, name: 'The Witness' },
    { appid: 736260, name: 'Baba Is You' },
    { appid: 257510, name: 'The Talos Principle' }
  ],
  'tag-益智---文字小遊戲': [
    { appid: 1003590, name: 'Tetris Effect: Connected' },
    { appid: 1325940, name: 'Puyo Puyo Tetris 2' },
    { appid: 353540, name: "Stephen's Sausage Roll" },
    { appid: 1764240, name: 'Knotwords' }
  ],
  'tag-棋牌': [
    { appid: 646570, name: 'Slay the Spire' },
    { appid: 2379780, name: 'Balatro' },
    { appid: 1092790, name: 'Inscryption' },
    { appid: 861540, name: 'Dicey Dungeons' }
  ],
  'tag-平台': [
    { appid: 504230, name: 'Celeste' },
    { appid: 367520, name: 'Hollow Knight' },
    { appid: 40800, name: 'Super Meat Boy' },
    { appid: 1057090, name: 'Ori and the Will of the Wisps' }
  ],
  'tag-roguelike': [
    { appid: 1145360, name: 'Hades' },
    { appid: 588650, name: 'Dead Cells' },
    { appid: 646570, name: 'Slay the Spire' },
    { appid: 250900, name: 'The Binding of Isaac: Rebirth' }
  ],
  'tag-探索---開放世界': [
    { appid: 1245620, name: 'Elden Ring' },
    { appid: 489830, name: 'The Elder Scrolls V: Skyrim Special Edition' },
    { appid: 264710, name: 'Subnautica' },
    { appid: 753640, name: 'Outer Wilds' }
  ],
  'tag-生存': [
    { appid: 346110, name: 'ARK: Survival Evolved' },
    { appid: 322330, name: "Don't Starve Together" },
    { appid: 892970, name: 'Valheim' },
    { appid: 242760, name: 'The Forest' }
  ],
  'tag-工藝---建造': [
    { appid: 105600, name: 'Terraria' },
    { appid: 892970, name: 'Valheim' },
    { appid: 361420, name: 'ASTRONEER' },
    { appid: 526870, name: 'Satisfactory' }
  ],
  'tag-敘事---劇情': [
    { appid: 632470, name: 'Disco Elysium' },
    { appid: 319630, name: 'Life is Strange' },
    { appid: 501300, name: 'What Remains of Edith Finch' },
    { appid: 1222140, name: 'Detroit: Become Human' }
  ],
  'tag-視覺小說': [
    { appid: 698780, name: 'Doki Doki Literature Club' },
    { appid: 412830, name: 'STEINS;GATE' },
    { appid: 787480, name: 'Phoenix Wright: Ace Attorney Trilogy' },
    { appid: 447530, name: 'VA-11 Hall-A' }
  ],
  'tag-選擇分歧': [
    { appid: 1222140, name: 'Detroit: Become Human' },
    { appid: 319630, name: 'Life is Strange' },
    { appid: 1328670, name: 'Mass Effect Legendary Edition' },
    { appid: 292030, name: 'The Witcher 3' }
  ],
  'tag-戀愛模擬': [
    { appid: 698780, name: 'Doki Doki Literature Club' },
    { appid: 413150, name: 'Stardew Valley' },
    { appid: 310080, name: 'Hatoful Boyfriend' },
    { appid: 339800, name: 'HuniePop' }
  ],
  'tag-音樂節奏': [
    { appid: 620980, name: 'Beat Saber' },
    { appid: 247080, name: 'Crypt of the NecroDancer' },
    { appid: 1817230, name: 'Hi-Fi RUSH' },
    { appid: 356570, name: 'Thumper' }
  ],
  'tag-運動': [
    { appid: 2338770, name: 'NBA 2K24' },
    { appid: 2195250, name: 'EA SPORTS FC 24' },
    { appid: 1548360, name: "Tony Hawk's Pro Skater 1+2" },
    { appid: 252950, name: 'Rocket League' }
  ],
  'tag-街機---小遊戲': [
    { appid: 2360660, name: 'Pinball FX' },
    { appid: 322170, name: 'Geometry Dash' },
    { appid: 1281340, name: 'PAC-MAN MUSEUM+' },
    { appid: 219890, name: 'Antichamber' }
  ],
  'tag-塔防': [
    { appid: 960090, name: 'Bloons TD 6' },
    { appid: 246420, name: 'Kingdom Rush' },
    { appid: 644930, name: 'They Are Billions' },
    { appid: 3590, name: 'Plants vs. Zombies GOTY' }
  ],
  'tag-自動對戰': [
    { appid: 1046930, name: 'Dota Underlords' },
    { appid: 1714040, name: 'Super Auto Pets' },
    { appid: 669500, name: 'Mechabellum' },
    { appid: 1053700, name: 'Storybook Brawl' }
  ],
  'tag-放置': [
    { appid: 1454400, name: 'Cookie Clicker' },
    { appid: 1267910, name: 'Melvor Idle' },
    { appid: 370570, name: 'NGU IDLE' },
    { appid: 627690, name: 'Idle Champions' }
  ],
  'tag-關卡編輯': [
    { appid: 4000, name: "Garry's Mod" },
    { appid: 2225070, name: 'Trackmania' },
    { appid: 322170, name: 'Geometry Dash' },
    { appid: 440310, name: 'Project Arrhythmia' }
  ],
  'tag-時空操控': [
    { appid: 26800, name: 'Braid' },
    { appid: 322500, name: 'SUPERHOT' },
    { appid: 753640, name: 'Outer Wilds' },
    { appid: 319630, name: 'Life is Strange' }
  ],
  'tag-程式設計': [
    { appid: 504210, name: 'SHENZHEN I/O' },
    { appid: 370360, name: 'TIS-100' },
    { appid: 375820, name: 'Human Resource Machine' },
    { appid: 558990, name: 'Opus Magnum' }
  ],
  'tag-教育學習': [
    { appid: 220200, name: 'Kerbal Space Program' },
    { appid: 792100, name: '7 Billion Humans' },
    { appid: 619150, name: 'while True: learn()' },
    { appid: 72200, name: 'Universe Sandbox' }
  ],
  'tag-qte-即時反應': [
    { appid: 1593500, name: 'God of War' },
    { appid: 1222140, name: 'Detroit: Become Human' },
    { appid: 960910, name: 'Heavy Rain' },
    { appid: 2050650, name: 'Resident Evil 4' }
  ],
  'tag-社交推理': [
    { appid: 945360, name: 'Among Us' },
    { appid: 1810550, name: 'Town of Salem 2' },
    { appid: 774861, name: 'Project Winter' },
    { appid: 1568590, name: 'Goose Goose Duck' }
  ],

  // === 情緒 ===
  'tag-沉浸': [
    { appid: 1174180, name: 'Red Dead Redemption 2' },
    { appid: 1091500, name: 'Cyberpunk 2077' },
    { appid: 1850570, name: 'DEATH STRANDING' },
    { appid: 264710, name: 'Subnautica' }
  ],
  'tag-唯美': [
    { appid: 638230, name: 'Journey' },
    { appid: 683320, name: 'GRIS' },
    { appid: 1132410, name: 'Sayonara Wild Hearts' },
    { appid: 384190, name: 'ABZU' }
  ],
  'tag-歡樂': [
    { appid: 837470, name: 'Untitled Goose Game' },
    { appid: 728880, name: 'Overcooked! 2' },
    { appid: 265930, name: 'Goat Simulator' },
    { appid: 1703340, name: 'The Stanley Parable: Ultra Deluxe' }
  ],
  'tag-放鬆': [
    { appid: 413150, name: 'Stardew Valley' },
    { appid: 914800, name: 'Coffee Talk' },
    { appid: 1055540, name: 'A Short Hike' },
    { appid: 1135690, name: 'Unpacking' }
  ],
  'tag-感動': [
    { appid: 206440, name: 'To the Moon' },
    { appid: 501300, name: 'What Remains of Edith Finch' },
    { appid: 1102130, name: 'Florence' },
    { appid: 972660, name: 'Spiritfarer' }
  ],
  'tag-黑暗': [
    { appid: 374320, name: 'Dark Souls III' },
    { appid: 814380, name: 'Sekiro: Shadows Die Twice' },
    { appid: 692850, name: "Bloodstained: Ritual of the Night" },
    { appid: 367520, name: 'Hollow Knight' }
  ],
  'tag-心理': [
    { appid: 632470, name: 'Disco Elysium' },
    { appid: 414340, name: "Hellblade: Senua's Sacrifice" },
    { appid: 50300, name: 'Spec Ops: The Line' },
    { appid: 239030, name: 'Papers, Please' }
  ],
  'tag-懷舊': [
    { appid: 250760, name: 'Shovel Knight' },
    { appid: 391540, name: 'Undertale' },
    { appid: 200900, name: 'Cave Story+' },
    { appid: 268910, name: 'Cuphead' }
  ],
  'tag-恐怖': [
    { appid: 883710, name: 'Resident Evil 2' },
    { appid: 739630, name: 'Phasmophobia' },
    { appid: 238320, name: 'Outlast' },
    { appid: 57300, name: 'Amnesia: The Dark Descent' }
  ],
  'tag-懸疑': [
    { appid: 653530, name: 'Return of the Obra Dinn' },
    { appid: 632470, name: 'Disco Elysium' },
    { appid: 368370, name: 'Her Story' },
    { appid: 874260, name: 'The Forgotten City' }
  ],
  'tag-暴力': [
    { appid: 976310, name: 'Mortal Kombat 11' },
    { appid: 782330, name: 'DOOM Eternal' },
    { appid: 219150, name: 'Hotline Miami' },
    { appid: 223470, name: 'POSTAL 2' }
  ],
  'tag-快節奏': [
    { appid: 782330, name: 'DOOM Eternal' },
    { appid: 219150, name: 'Hotline Miami' },
    { appid: 601150, name: 'Devil May Cry 5' },
    { appid: 1229490, name: 'ULTRAKILL' }
  ],
  'tag-困難': [
    { appid: 814380, name: 'Sekiro: Shadows Die Twice' },
    { appid: 1245620, name: 'Elden Ring' },
    { appid: 268910, name: 'Cuphead' },
    { appid: 240720, name: 'Getting Over It' }
  ],
  'tag-易上癮': [
    { appid: 1794680, name: 'Vampire Survivors' },
    { appid: 2379780, name: 'Balatro' },
    { appid: 646570, name: 'Slay the Spire' },
    { appid: 413150, name: 'Stardew Valley' }
  ],
  'tag-成人向': [
    { appid: 1034140, name: 'Subverse' },
    { appid: 339800, name: 'HuniePop' },
    { appid: 698780, name: 'Doki Doki Literature Club' },
    { appid: 611790, name: 'House Party' }
  ],

  // === 多人 ===
  'tag-單人': [
    { appid: 1145360, name: 'Hades' },
    { appid: 367520, name: 'Hollow Knight' },
    { appid: 632470, name: 'Disco Elysium' },
    { appid: 292030, name: 'The Witcher 3' }
  ],
  'tag-合作': [
    { appid: 1426210, name: 'It Takes Two' },
    { appid: 548430, name: 'Deep Rock Galactic' },
    { appid: 322330, name: "Don't Starve Together" },
    { appid: 739630, name: 'Phasmophobia' }
  ],
  'tag-競爭': [
    { appid: 730, name: 'Counter-Strike 2' },
    { appid: 1172470, name: 'Apex Legends' },
    { appid: 252950, name: 'Rocket League' },
    { appid: 1778820, name: 'Tekken 8' }
  ],
  'tag-moba': [
    { appid: 570, name: 'Dota 2' },
    { appid: 386360, name: 'SMITE' },
    { appid: 504370, name: 'Battlerite' },
    { appid: 204300, name: 'Awesomenauts' }
  ],
  'tag-大型多人': [
    { appid: 39210, name: 'FINAL FANTASY XIV Online' },
    { appid: 1063730, name: 'New World' },
    { appid: 582660, name: 'Black Desert' },
    { appid: 1599340, name: 'Lost Ark' }
  ],
  'tag-派對': [
    { appid: 728880, name: 'Overcooked! 2' },
    { appid: 285900, name: 'Gang Beasts' },
    { appid: 880940, name: 'Pummel Party' },
    { appid: 323850, name: 'Move or Die' }
  ],
  'tag-異步多人': [
    { appid: 1850570, name: 'DEATH STRANDING' },
    { appid: 374320, name: 'Dark Souls III' },
    { appid: 1245620, name: 'Elden Ring' },
    { appid: 418530, name: 'Spelunky 2' }
  ],
  'tag-非對稱': [
    { appid: 381210, name: 'Dead by Daylight' },
    { appid: 438740, name: 'Friday the 13th: The Game' },
    { appid: 1433140, name: 'The Texas Chain Saw Massacre' },
    { appid: 377140, name: 'White Noise 2' }
  ],

  // === 美術 ===
  'tag-寫實': [
    { appid: 1174180, name: 'Red Dead Redemption 2' },
    { appid: 1091500, name: 'Cyberpunk 2077' },
    { appid: 1250410, name: 'Microsoft Flight Simulator' },
    { appid: 1551360, name: 'Forza Horizon 5' }
  ],
  'tag-像素風': [
    { appid: 413150, name: 'Stardew Valley' },
    { appid: 105600, name: 'Terraria' },
    { appid: 257850, name: 'Hyper Light Drifter' },
    { appid: 391540, name: 'Undertale' }
  ],
  'tag-卡通': [
    { appid: 397540, name: 'Borderlands 3' },
    { appid: 268910, name: 'Cuphead' },
    { appid: 1172620, name: 'Sea of Thieves' },
    { appid: 440, name: 'Team Fortress 2' }
  ],
  'tag-日系動畫': [
    { appid: 1687950, name: 'Persona 5 Royal' },
    { appid: 1384160, name: 'GUILTY GEAR -STRIVE-' },
    { appid: 524220, name: 'NieR:Automata' },
    { appid: 740130, name: 'Tales of Arise' }
  ],
  'tag-手繪': [
    { appid: 268910, name: 'Cuphead' },
    { appid: 367520, name: 'Hollow Knight' },
    { appid: 1145360, name: 'Hades' },
    { appid: 219740, name: "Don't Starve" }
  ],
  'tag-風格化': [
    { appid: 757310, name: 'Sable' },
    { appid: 397540, name: 'Borderlands 3' },
    { appid: 1817230, name: 'Hi-Fi RUSH' },
    { appid: 1172620, name: 'Sea of Thieves' }
  ],
  'tag-漫畫': [
    { appid: 397540, name: 'Borderlands 3' },
    { appid: 1289310, name: 'XIII' },
    { appid: 250320, name: 'The Wolf Among Us' },
    { appid: 614570, name: 'Tales from the Borderlands' }
  ],
  'tag-極簡': [
    { appid: 287980, name: 'Mini Metro' },
    { appid: 220780, name: 'Thomas Was Alone' },
    { appid: 266010, name: 'LYNE' },
    { appid: 1495630, name: 'Monument Valley' }
  ],
  'tag-復古': [
    { appid: 250760, name: 'Shovel Knight' },
    { appid: 413150, name: 'Stardew Valley' },
    { appid: 268910, name: 'Cuphead' },
    { appid: 200900, name: 'Cave Story+' }
  ],
  'tag-試驗性': [
    { appid: 368370, name: 'Her Story' },
    { appid: 1116510, name: 'Telling Lies' },
    { appid: 1450330, name: 'Immortality' },
    { appid: 398850, name: 'The Bunker' }
  ],

  // === 設定 ===
  'tag-奇幻': [
    { appid: 292030, name: 'The Witcher 3' },
    { appid: 489830, name: 'The Elder Scrolls V: Skyrim Special Edition' },
    { appid: 1245620, name: 'Elden Ring' },
    { appid: 435150, name: "Divinity: Original Sin 2" }
  ],
  'tag-科幻': [
    { appid: 1328670, name: 'Mass Effect Legendary Edition' },
    { appid: 1091500, name: 'Cyberpunk 2077' },
    { appid: 337000, name: 'Deus Ex: Mankind Divided' },
    { appid: 482400, name: 'System Shock' }
  ],
  'tag-太空': [
    { appid: 359320, name: 'Elite Dangerous' },
    { appid: 275850, name: "No Man's Sky" },
    { appid: 281990, name: 'Stellaris' },
    { appid: 220200, name: 'Kerbal Space Program' }
  ],
  'tag-末日---反烏托邦': [
    { appid: 377160, name: 'Fallout 4' },
    { appid: 412020, name: 'Metro Exodus' },
    { appid: 282070, name: 'This War of Mine' },
    { appid: 323190, name: 'Frostpunk' }
  ],
  'tag-戰爭---軍事': [
    { appid: 107410, name: 'Arma 3' },
    { appid: 686810, name: 'Hell Let Loose' },
    { appid: 393380, name: 'Squad' },
    { appid: 1238810, name: 'Battlefield V' }
  ],
  'tag-歷史': [
    { appid: 812140, name: "Assassin's Creed Odyssey" },
    { appid: 379430, name: 'Kingdom Come: Deliverance' },
    { appid: 261550, name: 'Mount & Blade II: Bannerlord' },
    { appid: 1158310, name: 'Crusader Kings III' }
  ],
  'tag-現代': [
    { appid: 271590, name: 'Grand Theft Auto V' },
    { appid: 202170, name: 'Sleeping Dogs' },
    { appid: 1126290, name: 'Saints Row' },
    { appid: 1030840, name: 'Mafia: Definitive Edition' }
  ],
  'tag-自然': [
    { appid: 264710, name: 'Subnautica' },
    { appid: 383870, name: 'Firewatch' },
    { appid: 305620, name: 'The Long Dark' },
    { appid: 815370, name: 'Green Hell' }
  ],
  'tag-動物': [
    { appid: 1332010, name: 'Stray' },
    { appid: 1675200, name: 'Goat Simulator 3' },
    { appid: 837470, name: 'Untitled Goose Game' },
    { appid: 17390, name: 'Spore' }
  ],
  'tag-超級英雄': [
    { appid: 1817070, name: "Marvel's Spider-Man Remastered" },
    { appid: 1817190, name: "Marvel's Spider-Man: Miles Morales" },
    { appid: 1088850, name: "Marvel's Guardians of the Galaxy" },
    { appid: 997080, name: "Marvel's Avengers" }
  ],
  'tag-特殊主角': [
    { appid: 1145360, name: 'Hades' },
    { appid: 632470, name: 'Disco Elysium' },
    { appid: 391540, name: 'Undertale' },
    { appid: 271590, name: 'Grand Theft Auto V' }
  ],
  'tag-政治': [
    { appid: 492720, name: 'Tropico 6' },
    { appid: 1207650, name: 'Suzerain' },
    { appid: 1410710, name: 'Democracy 4' },
    { appid: 323190, name: 'Frostpunk' }
  ],
  'tag-lgbtq': [
    { appid: 936790, name: 'Life is Strange: True Colors' },
    { appid: 583390, name: 'Dream Daddy' },
    { appid: 1093520, name: 'If Found...' },
    { appid: 1145360, name: 'Hades' }
  ],
  'tag-網路梗': [
    { appid: 837470, name: 'Untitled Goose Game' },
    { appid: 265930, name: 'Goat Simulator' },
    { appid: 233720, name: 'Surgeon Simulator' },
    { appid: 321360, name: 'I am Bread' }
  ]
};

const data = JSON.parse(readFileSync(PATH, 'utf-8'));
let touched = 0;
let missing = [];
for (const g of data.genres) {
  for (const t of g.topics) {
    const ex = E[t.id];
    if (!ex) {
      missing.push(`${g.id}/${t.id}`);
      continue;
    }
    t.examples = ex;
    touched++;
  }
}
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ 寫入 examples: ${touched} 個 topics`);
if (missing.length) console.log(`⚠ 缺少: ${missing.join(', ')}`);

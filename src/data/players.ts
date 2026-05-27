import type { RealPlayer, PackRarity, PlayerStats } from '../types'
import { STAT_KEYS } from '../types'

// ── ICON LEGENDS (89–99) ─────────────────────────────────────────────────────
export const ICON_LEGENDS: RealPlayer[] = [
  { id: 'pele',           name: 'Pelé',            club: 'Santos',          nation: 'Brazil',      position: 'ST',  overall: 95, wikiTitle: 'Pelé',                      stats: { PAC: 93, SHO: 95, PAS: 91, DRI: 94, DEF: 58, PHY: 74 } },
  { id: 'maradona',       name: 'Maradona',        club: 'Napoli',          nation: 'Argentina',   position: 'CAM', overall: 94, wikiTitle: 'Diego Maradona',            stats: { PAC: 91, SHO: 92, PAS: 93, DRI: 96, DEF: 40, PHY: 78 } },
  { id: 'ronaldo_r9',     name: 'Ronaldo',         club: 'Real Madrid',     nation: 'Brazil',      position: 'ST',  overall: 94, wikiTitle: 'Ronaldo (Brazilian footballer)', stats: { PAC: 94, SHO: 94, PAS: 78, DRI: 93, DEF: 42, PHY: 75 } },
  { id: 'messi',          name: 'Messi',           club: 'Barcelona',       nation: 'Argentina',   position: 'RW',  overall: 93, wikiTitle: 'Lionel Messi',              stats: { PAC: 85, SHO: 92, PAS: 91, DRI: 96, DEF: 35, PHY: 65 } },
  { id: 'maldini',        name: 'Maldini',         club: 'AC Milan',        nation: 'Italy',       position: 'CB',  overall: 92, wikiTitle: 'Paolo Maldini',             stats: { PAC: 82, SHO: 55, PAS: 74, DRI: 72, DEF: 95, PHY: 82 } },
  { id: 'ronaldinho',     name: 'Ronaldinho',      club: 'Barcelona',       nation: 'Brazil',      position: 'LW',  overall: 91, wikiTitle: 'Ronaldinho',                  stats: { PAC: 89, SHO: 86, PAS: 90, DRI: 95, DEF: 38, PHY: 72 } },
  { id: 'zidane',         name: 'Zidane',          club: 'Real Madrid',     nation: 'France',      position: 'CAM', overall: 91, wikiTitle: 'Zinedine Zidane',           stats: { PAC: 82, SHO: 88, PAS: 92, DRI: 94, DEF: 72, PHY: 84 } },
  { id: 'eusebio',        name: 'Eusébio',         club: 'Benfica',         nation: 'Portugal',    position: 'ST',  overall: 91, wikiTitle: 'Eusébio',                     stats: { PAC: 91, SHO: 93, PAS: 82, DRI: 90, DEF: 44, PHY: 76 } },
  { id: 'baresi',         name: 'Baresi',          club: 'AC Milan',        nation: 'Italy',       position: 'CB',  overall: 91, wikiTitle: 'Franco Baresi',             stats: { PAC: 78, SHO: 48, PAS: 72, DRI: 70, DEF: 94, PHY: 80 } },
  { id: 'beckenbauer',    name: 'Beckenbauer',     club: 'Bayern Munich',   nation: 'Germany',     position: 'CB',  overall: 91, wikiTitle: 'Franz Beckenbauer',         stats: { PAC: 80, SHO: 72, PAS: 88, DRI: 84, DEF: 92, PHY: 78 } },
  { id: 'platini',        name: 'Platini',         club: 'Juventus',        nation: 'France',      position: 'CAM', overall: 91, wikiTitle: 'Michel Platini',            stats: { PAC: 84, SHO: 91, PAS: 92, DRI: 90, DEF: 58, PHY: 72 } },
  { id: 'van_basten',     name: 'Van Basten',      club: 'AC Milan',        nation: 'Netherlands', position: 'ST',  overall: 90, wikiTitle: 'Marco van Basten',          stats: { PAC: 86, SHO: 93, PAS: 80, DRI: 88, DEF: 42, PHY: 78 } },
  { id: 'cruyff',         name: 'Cruyff',          club: 'Barcelona',       nation: 'Netherlands', position: 'CF',  overall: 90, wikiTitle: 'Johan Cruyff',              stats: { PAC: 88, SHO: 88, PAS: 91, DRI: 93, DEF: 42, PHY: 70 } },
  { id: 'henry',          name: 'Henry',           club: 'Arsenal',         nation: 'France',      position: 'ST',  overall: 90, wikiTitle: 'Thierry Henry',             stats: { PAC: 93, SHO: 89, PAS: 82, DRI: 90, DEF: 38, PHY: 76 } },
  { id: 'xavi',           name: 'Xavi',            club: 'Barcelona',       nation: 'Spain',       position: 'CM',  overall: 90, wikiTitle: 'Xavi',                        stats: { PAC: 76, SHO: 78, PAS: 94, DRI: 90, DEF: 68, PHY: 66 } },
  { id: 'gullit',         name: 'Gullit',          club: 'AC Milan',        nation: 'Netherlands', position: 'CAM', overall: 90, wikiTitle: 'Ruud Gullit',               stats: { PAC: 84, SHO: 86, PAS: 86, DRI: 86, DEF: 78, PHY: 88 } },
  { id: 'best',           name: 'Best',            club: 'Man United',      nation: 'N. Ireland',  position: 'RW',  overall: 90, wikiTitle: 'George Best',               stats: { PAC: 92, SHO: 88, PAS: 82, DRI: 93, DEF: 36, PHY: 68 } },
  { id: 'iniesta',        name: 'Iniesta',         club: 'Barcelona',       nation: 'Spain',       position: 'CM',  overall: 89, wikiTitle: 'Andrés Iniesta',            stats: { PAC: 78, SHO: 80, PAS: 92, DRI: 93, DEF: 62, PHY: 64 } },
  { id: 'roberto_carlos', name: 'Roberto Carlos',  club: 'Real Madrid',     nation: 'Brazil',      position: 'LB',  overall: 89, wikiTitle: 'Roberto Carlos',            stats: { PAC: 90, SHO: 82, PAS: 84, DRI: 82, DEF: 82, PHY: 84 } },
  { id: 'bergkamp',       name: 'Bergkamp',        club: 'Arsenal',         nation: 'Netherlands', position: 'CF',  overall: 89, wikiTitle: 'Dennis Bergkamp',           stats: { PAC: 84, SHO: 88, PAS: 86, DRI: 90, DEF: 40, PHY: 72 } },
]

export const PLAYERS: RealPlayer[] = [
  // ── CURRENT STARS (gold pack pool — toned down at open) ───────────────────
  { id: 'mbappe',          name: 'Mbappé',          club: 'Real Madrid',     nation: 'France',      position: 'ST',  overall: 91, wikiTitle: 'Kylian Mbappé',             stats: { PAC: 97, SHO: 89, PAS: 80, DRI: 92, DEF: 36, PHY: 76 } },
  { id: 'haaland',         name: 'Haaland',          club: 'Man City',        nation: 'Norway',      position: 'ST',  overall: 91, wikiTitle: 'Erling Haaland',            stats: { PAC: 89, SHO: 93, PAS: 66, DRI: 80, DEF: 45, PHY: 88 } },
  { id: 'lewandowski',     name: 'Lewandowski',      club: 'Barcelona',       nation: 'Poland',      position: 'ST',  overall: 90, wikiTitle: 'Robert Lewandowski',        stats: { PAC: 78, SHO: 92, PAS: 79, DRI: 86, DEF: 44, PHY: 82 } },
  { id: 'de_bruyne',       name: 'De Bruyne',        club: 'Man City',        nation: 'Belgium',     position: 'CM',  overall: 91, wikiTitle: 'Kevin De Bruyne',          stats: { PAC: 76, SHO: 86, PAS: 93, DRI: 88, DEF: 64, PHY: 76 } },
  { id: 'salah',           name: 'Salah',            club: 'Liverpool',       nation: 'Egypt',       position: 'RW',  overall: 89, wikiTitle: 'Mohamed Salah',            stats: { PAC: 93, SHO: 87, PAS: 80, DRI: 91, DEF: 45, PHY: 75 } },
  { id: 'vinicius',        name: 'Vinícius Jr',      club: 'Real Madrid',     nation: 'Brazil',      position: 'LW',  overall: 89, wikiTitle: 'Vinícius Júnior',          stats: { PAC: 95, SHO: 80, PAS: 78, DRI: 93, DEF: 28, PHY: 68 } },
  { id: 'benzema',         name: 'Benzema',          club: 'Al Ittihad',      nation: 'France',      position: 'ST',  overall: 89, wikiTitle: 'Karim Benzema',            stats: { PAC: 76, SHO: 86, PAS: 81, DRI: 87, DEF: 38, PHY: 78 } },
  { id: 'bellingham',      name: 'Bellingham',       club: 'Real Madrid',     nation: 'England',     position: 'CAM', overall: 88, wikiTitle: 'Jude Bellingham',          stats: { PAC: 79, SHO: 82, PAS: 83, DRI: 88, DEF: 68, PHY: 79 } },
  { id: 'modric',          name: 'Modrić',           club: 'Real Madrid',     nation: 'Croatia',     position: 'CM',  overall: 87, wikiTitle: 'Luka Modrić',             stats: { PAC: 74, SHO: 76, PAS: 90, DRI: 90, DEF: 72, PHY: 65 } },
  { id: 'kroos',           name: 'Kroos',            club: 'Real Madrid',     nation: 'Germany',     position: 'CM',  overall: 88, wikiTitle: 'Toni Kroos',               stats: { PAC: 59, SHO: 78, PAS: 93, DRI: 82, DEF: 75, PHY: 66 } },
  { id: 'pedri',           name: 'Pedri',            club: 'Barcelona',       nation: 'Spain',       position: 'CM',  overall: 87, wikiTitle: 'Pedri',                     stats: { PAC: 74, SHO: 75, PAS: 88, DRI: 90, DEF: 62, PHY: 60 } },
  { id: 'rodri',           name: 'Rodri',            club: 'Man City',        nation: 'Spain',       position: 'CDM', overall: 89, wikiTitle: 'Rodri (footballer)',        stats: { PAC: 65, SHO: 66, PAS: 85, DRI: 78, DEF: 88, PHY: 84 } },
  { id: 'kante',           name: 'Kanté',            club: 'Al Ittihad',      nation: 'France',      position: 'CDM', overall: 87, wikiTitle: "N'Golo Kanté",             stats: { PAC: 78, SHO: 66, PAS: 75, DRI: 79, DEF: 90, PHY: 82 } },
  { id: 'van_dijk',        name: 'Van Dijk',         club: 'Liverpool',       nation: 'Netherlands', position: 'CB',  overall: 89, wikiTitle: 'Virgil van Dijk',          stats: { PAC: 78, SHO: 42, PAS: 71, DRI: 66, DEF: 91, PHY: 88 } },
  { id: 'dias',            name: 'Rúben Dias',       club: 'Man City',        nation: 'Portugal',    position: 'CB',  overall: 88, wikiTitle: 'Rúben Dias',               stats: { PAC: 77, SHO: 37, PAS: 65, DRI: 64, DEF: 91, PHY: 86 } },
  { id: 'osimhen',         name: 'Osimhen',          club: 'Napoli',          nation: 'Nigeria',     position: 'ST',  overall: 87, wikiTitle: 'Victor Osimhen',           stats: { PAC: 91, SHO: 85, PAS: 65, DRI: 80, DEF: 37, PHY: 83 } },
  { id: 'griezmann',       name: 'Griezmann',        club: 'Atlético Madrid', nation: 'France',      position: 'CF',  overall: 87, wikiTitle: 'Antoine Griezmann',        stats: { PAC: 80, SHO: 85, PAS: 83, DRI: 86, DEF: 57, PHY: 73 } },
  { id: 'neymar',          name: 'Neymar',           club: 'Al Hilal',        nation: 'Brazil',      position: 'LW',  overall: 87, wikiTitle: 'Neymar',                    stats: { PAC: 87, SHO: 83, PAS: 86, DRI: 94, DEF: 37, PHY: 61 } },
  { id: 'bernardo',        name: 'B. Silva',         club: 'Man City',        nation: 'Portugal',    position: 'CAM', overall: 87, wikiTitle: 'Bernardo Silva',           stats: { PAC: 80, SHO: 79, PAS: 87, DRI: 90, DEF: 68, PHY: 64 } },
  { id: 'valverde',        name: 'Valverde',         club: 'Real Madrid',     nation: 'Uruguay',     position: 'CM',  overall: 86, wikiTitle: 'Federico Valverde',        stats: { PAC: 85, SHO: 78, PAS: 80, DRI: 82, DEF: 75, PHY: 85 } },
  { id: 'dembele',         name: 'Dembélé',          club: 'PSG',             nation: 'France',      position: 'RW',  overall: 86, wikiTitle: 'Ousmane Dembélé',          stats: { PAC: 92, SHO: 79, PAS: 78, DRI: 89, DEF: 32, PHY: 65 } },
  { id: 'saka',            name: 'Saka',             club: 'Arsenal',         nation: 'England',     position: 'RW',  overall: 85, wikiTitle: 'Bukayo Saka',              stats: { PAC: 86, SHO: 80, PAS: 82, DRI: 87, DEF: 55, PHY: 68 } },
  { id: 'martinez_l',      name: 'L. Martínez',      club: 'Inter',           nation: 'Argentina',   position: 'ST',  overall: 85, wikiTitle: 'Lautaro Martínez',         stats: { PAC: 82, SHO: 85, PAS: 73, DRI: 83, DEF: 41, PHY: 81 } },
  { id: 'vlahovic',        name: 'Vlahović',         club: 'Juventus',        nation: 'Serbia',      position: 'ST',  overall: 84, wikiTitle: 'Dušan Vlahović',           stats: { PAC: 80, SHO: 87, PAS: 67, DRI: 78, DEF: 36, PHY: 83 } },
  { id: 'rashford',        name: 'Rashford',         club: 'Man United',      nation: 'England',     position: 'LW',  overall: 84, wikiTitle: 'Marcus Rashford',          stats: { PAC: 92, SHO: 79, PAS: 72, DRI: 85, DEF: 33, PHY: 74 } },
  { id: 'alexander_arnold', name: 'Trent A-A',       club: 'Liverpool',       nation: 'England',     position: 'RB',  overall: 87, wikiTitle: 'Trent Alexander-Arnold',   stats: { PAC: 80, SHO: 72, PAS: 88, DRI: 79, DEF: 73, PHY: 66 } },
  { id: 'militao',         name: 'Militão',          club: 'Real Madrid',     nation: 'Brazil',      position: 'CB',  overall: 85, wikiTitle: 'Éder Militão',             stats: { PAC: 83, SHO: 43, PAS: 63, DRI: 68, DEF: 86, PHY: 83 } },
  { id: 'rudiger',         name: 'Rüdiger',          club: 'Real Madrid',     nation: 'Germany',     position: 'CB',  overall: 84, wikiTitle: 'Antonio Rüdiger',          stats: { PAC: 77, SHO: 38, PAS: 60, DRI: 61, DEF: 86, PHY: 87 } },
  { id: 'hernandez_t',     name: 'T. Hernández',     club: 'AC Milan',        nation: 'France',      position: 'LB',  overall: 85, wikiTitle: 'Theo Hernández',           stats: { PAC: 90, SHO: 63, PAS: 72, DRI: 80, DEF: 76, PHY: 77 } },
  { id: 'cancelo',         name: 'Cancelo',          club: 'Barcelona',       nation: 'Portugal',    position: 'RB',  overall: 85, wikiTitle: 'João Cancelo',             stats: { PAC: 83, SHO: 66, PAS: 79, DRI: 82, DEF: 77, PHY: 70 } },
  { id: 'gvardiol',        name: 'Gvardiol',         club: 'Man City',        nation: 'Croatia',     position: 'LB',  overall: 84, wikiTitle: 'Joško Gvardiol',           stats: { PAC: 82, SHO: 48, PAS: 72, DRI: 72, DEF: 84, PHY: 83 } },
  { id: 'kimmich',         name: 'Kimmich',          club: 'Bayern Munich',   nation: 'Germany',     position: 'CDM', overall: 88, wikiTitle: 'Joshua Kimmich',           stats: { PAC: 70, SHO: 68, PAS: 87, DRI: 82, DEF: 83, PHY: 73 } },
  { id: 'casemiro',        name: 'Casemiro',         club: 'Man United',      nation: 'Brazil',      position: 'CDM', overall: 87, wikiTitle: 'Casemiro',                 stats: { PAC: 62, SHO: 65, PAS: 75, DRI: 72, DEF: 87, PHY: 89 } },
  { id: 'bruno',           name: 'B. Fernandes',     club: 'Man United',      nation: 'Portugal',    position: 'CAM', overall: 86, wikiTitle: 'Bruno Fernandes',          stats: { PAC: 74, SHO: 82, PAS: 88, DRI: 84, DEF: 57, PHY: 72 } },
  { id: 'gavi',            name: 'Gavi',             club: 'Barcelona',       nation: 'Spain',       position: 'CM',  overall: 85, wikiTitle: 'Gavi (footballer)',         stats: { PAC: 73, SHO: 70, PAS: 84, DRI: 86, DEF: 76, PHY: 66 } },
  { id: 'camavinga',       name: 'Camavinga',        club: 'Real Madrid',     nation: 'France',      position: 'CM',  overall: 84, wikiTitle: 'Eduardo Camavinga',        stats: { PAC: 80, SHO: 72, PAS: 79, DRI: 83, DEF: 76, PHY: 78 } },
  { id: 'yamal',           name: 'Yamal',            club: 'Barcelona',       nation: 'Spain',       position: 'RW',  overall: 83, wikiTitle: 'Lamine Yamal',             stats: { PAC: 88, SHO: 74, PAS: 82, DRI: 90, DEF: 29, PHY: 55 } },
  { id: 'alaba',           name: 'Alaba',            club: 'Real Madrid',     nation: 'Austria',     position: 'CB',  overall: 85, wikiTitle: 'David Alaba',              stats: { PAC: 75, SHO: 55, PAS: 76, DRI: 73, DEF: 86, PHY: 79 } },
  { id: 'robertson',       name: 'Robertson',        club: 'Liverpool',       nation: 'Scotland',    position: 'LB',  overall: 85, wikiTitle: 'Andrew Robertson',         stats: { PAC: 83, SHO: 57, PAS: 81, DRI: 76, DEF: 81, PHY: 73 } },

  // ── SILVER (75–82) ─────────────────────────────────────────────────────────
  { id: 'martinelli',      name: 'Martinelli',       club: 'Arsenal',         nation: 'Brazil',      position: 'LW',  overall: 82, wikiTitle: 'Gabriel Martinelli',       stats: { PAC: 91, SHO: 78, PAS: 72, DRI: 84, DEF: 38, PHY: 66 } },
  { id: 'mac_allister',    name: 'Mac Allister',     club: 'Liverpool',       nation: 'Argentina',   position: 'CM',  overall: 81, wikiTitle: 'Alexis Mac Allister',      stats: { PAC: 72, SHO: 74, PAS: 82, DRI: 80, DEF: 72, PHY: 74 } },
  { id: 'maddison',        name: 'Maddison',         club: 'Tottenham',       nation: 'England',     position: 'CAM', overall: 82, wikiTitle: 'James Maddison',           stats: { PAC: 72, SHO: 79, PAS: 84, DRI: 83, DEF: 48, PHY: 65 } },
  { id: 'tonali',          name: 'Tonali',           club: 'Newcastle',       nation: 'Italy',       position: 'CDM', overall: 82, wikiTitle: 'Sandro Tonali',            stats: { PAC: 70, SHO: 68, PAS: 81, DRI: 78, DEF: 82, PHY: 79 } },
  { id: 'thuram_m',        name: 'M. Thuram',        club: 'Inter',           nation: 'France',      position: 'ST',  overall: 82, wikiTitle: 'Marcus Thuram',            stats: { PAC: 86, SHO: 78, PAS: 70, DRI: 79, DEF: 40, PHY: 84 } },
  { id: 'bremer',          name: 'Bremer',           club: 'Juventus',        nation: 'Brazil',      position: 'CB',  overall: 82, wikiTitle: 'Gleison Bremer',           stats: { PAC: 76, SHO: 33, PAS: 58, DRI: 60, DEF: 85, PHY: 86 } },
  { id: 'cody_gakpo',      name: 'Gakpo',            club: 'Liverpool',       nation: 'Netherlands', position: 'LW',  overall: 79, wikiTitle: 'Cody Gakpo',              stats: { PAC: 85, SHO: 75, PAS: 74, DRI: 81, DEF: 37, PHY: 72 } },
  { id: 'ansu_fati',       name: 'Ansu Fati',        club: 'Barcelona',       nation: 'Spain',       position: 'LW',  overall: 78, wikiTitle: 'Ansu Fati',               stats: { PAC: 88, SHO: 74, PAS: 70, DRI: 84, DEF: 30, PHY: 58 } },
  { id: 'ben_white',       name: 'Ben White',        club: 'Arsenal',         nation: 'England',     position: 'RB',  overall: 80, wikiTitle: 'Ben White (footballer)',   stats: { PAC: 78, SHO: 48, PAS: 71, DRI: 72, DEF: 80, PHY: 73 } },
  { id: 'ivan_toney',      name: 'Toney',            club: 'Brentford',       nation: 'England',     position: 'ST',  overall: 78, wikiTitle: 'Ivan Toney',              stats: { PAC: 74, SHO: 81, PAS: 66, DRI: 74, DEF: 36, PHY: 82 } },
  { id: 'christensen',     name: 'A. Christensen',   club: 'Barcelona',       nation: 'Denmark',     position: 'CB',  overall: 82, wikiTitle: 'Andreas Christensen',      stats: { PAC: 74, SHO: 35, PAS: 68, DRI: 63, DEF: 83, PHY: 78 } },
  { id: 'goretzka',        name: 'Goretzka',         club: 'Bayern Munich',   nation: 'Germany',     position: 'CM',  overall: 85, wikiTitle: 'Leon Goretzka',            stats: { PAC: 72, SHO: 77, PAS: 80, DRI: 78, DEF: 76, PHY: 85 } },
  { id: 'brennan_j',       name: 'B. Johnson',       club: 'Tottenham',       nation: 'Wales',       position: 'RW',  overall: 79, wikiTitle: 'Brennan Johnson',          stats: { PAC: 88, SHO: 73, PAS: 68, DRI: 80, DEF: 32, PHY: 68 } },
  { id: 'firmino',         name: 'Firmino',          club: 'Al Ahli',         nation: 'Brazil',      position: 'ST',  overall: 83, wikiTitle: 'Roberto Firmino',          stats: { PAC: 78, SHO: 79, PAS: 82, DRI: 84, DEF: 56, PHY: 74 } },
  { id: 'suarez',          name: 'Suárez',           club: 'Inter Miami',     nation: 'Uruguay',     position: 'ST',  overall: 83, wikiTitle: 'Luis Suárez',              stats: { PAC: 74, SHO: 87, PAS: 77, DRI: 84, DEF: 40, PHY: 75 } },
  { id: 'malo_gusto',      name: 'Malo Gusto',       club: 'Chelsea',         nation: 'France',      position: 'RB',  overall: 77, wikiTitle: 'Malo Gusto',               stats: { PAC: 84, SHO: 52, PAS: 68, DRI: 74, DEF: 76, PHY: 70 } },
  { id: 'tsimikas',        name: 'Tsimikas',         club: 'Liverpool',       nation: 'Greece',      position: 'LB',  overall: 76, wikiTitle: 'Kostas Tsimikas',          stats: { PAC: 80, SHO: 48, PAS: 72, DRI: 70, DEF: 75, PHY: 70 } },
  { id: 'evan_ferguson',   name: 'E. Ferguson',      club: 'Brighton',        nation: 'Ireland',     position: 'ST',  overall: 75, wikiTitle: 'Evan Ferguson',             stats: { PAC: 74, SHO: 77, PAS: 62, DRI: 72, DEF: 30, PHY: 78 } },

  // ── BRONZE (60–74) ─────────────────────────────────────────────────────────
  { id: 'hwang',           name: 'Hwang Hee-chan',   club: 'Wolves',          nation: 'South Korea', position: 'RW',  overall: 73, wikiTitle: 'Hwang Hee-chan',            stats: { PAC: 88, SHO: 70, PAS: 60, DRI: 73, DEF: 30, PHY: 68 } },
  { id: 'lyle_foster',     name: 'L. Foster',        club: 'Burnley',         nation: 'S. Africa',   position: 'ST',  overall: 70, wikiTitle: 'Lyle Foster',               stats: { PAC: 78, SHO: 68, PAS: 55, DRI: 66, DEF: 28, PHY: 75 } },
  { id: 'wharton',         name: 'Wharton',          club: 'Crystal Palace',  nation: 'England',     position: 'CDM', overall: 72, wikiTitle: 'Adam Wharton',              stats: { PAC: 68, SHO: 52, PAS: 70, DRI: 64, DEF: 73, PHY: 74 } },
  { id: 'baleba',          name: 'Baleba',           club: 'Brighton',        nation: 'Cameroon',    position: 'CM',  overall: 72, wikiTitle: 'Carlos Baleba',             stats: { PAC: 74, SHO: 58, PAS: 68, DRI: 70, DEF: 70, PHY: 76 } },
  { id: 'zeki_celik',      name: 'Z. Çelik',         club: 'Roma',            nation: 'Turkey',      position: 'RB',  overall: 73, wikiTitle: 'Zeki Çelik',               stats: { PAC: 80, SHO: 48, PAS: 65, DRI: 68, DEF: 74, PHY: 70 } },
  { id: 'igor_thiago',     name: 'I. Thiago',        club: 'Club Brugge',     nation: 'Brazil',      position: 'ST',  overall: 73,                                          stats: { PAC: 79, SHO: 72, PAS: 58, DRI: 70, DEF: 28, PHY: 76 } },
  { id: 'pepe_marrero',    name: 'Marrero',          club: 'Las Palmas',      nation: 'Spain',       position: 'ST',  overall: 68,                                          stats: { PAC: 70, SHO: 66, PAS: 55, DRI: 64, DEF: 24, PHY: 68 } },
  { id: 'kristoffer',      name: 'Kristoffer',       club: 'Brondby',         nation: 'Denmark',     position: 'CB',  overall: 69,                                          stats: { PAC: 64, SHO: 28, PAS: 52, DRI: 50, DEF: 70, PHY: 72 } },
  { id: 'jakub_kiwior',    name: 'Kiwior',           club: 'Arsenal',         nation: 'Poland',      position: 'CB',  overall: 74, wikiTitle: 'Jakub Kiwior',              stats: { PAC: 72, SHO: 32, PAS: 60, DRI: 58, DEF: 76, PHY: 74 } },
  { id: 'ollie_cooper',    name: 'O. Cooper',        club: 'Swansea',         nation: 'Wales',       position: 'CM',  overall: 67,                                          stats: { PAC: 65, SHO: 58, PAS: 68, DRI: 66, DEF: 58, PHY: 60 } },
  { id: 'liam_delap',      name: 'L. Delap',         club: 'Ipswich',         nation: 'England',     position: 'ST',  overall: 73, wikiTitle: 'Liam Delap',                stats: { PAC: 76, SHO: 73, PAS: 56, DRI: 68, DEF: 26, PHY: 80 } },
  { id: 'djed_spence',     name: 'D. Spence',        club: 'Leeds',           nation: 'England',     position: 'RB',  overall: 70, wikiTitle: 'Djed Spence',               stats: { PAC: 85, SHO: 44, PAS: 60, DRI: 66, DEF: 68, PHY: 66 } },
  { id: 'ali_may',         name: 'A. May',           club: 'Crawley Town',    nation: 'England',     position: 'LW',  overall: 63,                                          stats: { PAC: 80, SHO: 58, PAS: 52, DRI: 62, DEF: 24, PHY: 56 } },
  { id: 'jaden_philogene', name: 'J. Philogene',     club: 'Aston Villa',     nation: 'England',     position: 'RW',  overall: 72, wikiTitle: 'Jaden Philogene',           stats: { PAC: 87, SHO: 65, PAS: 60, DRI: 72, DEF: 28, PHY: 60 } },
]

const ICON_IDS = new Set(ICON_LEGENDS.map(p => p.id))
const GOLD_STAT_NERF = 7
const GOLD_OVR_CAP = 88
const ICON_FORGE_NERF = 14
const ICON_FORGE_OVR_CAP = 82

function overallFromStats(stats: PlayerStats): number {
  return Math.round(STAT_KEYS.reduce((sum, key) => sum + stats[key], 0) / STAT_KEYS.length)
}

function toneDownForGoldPack(player: RealPlayer): RealPlayer {
  const stats = {} as PlayerStats
  for (const key of STAT_KEYS) {
    stats[key] = Math.max(40, player.stats[key] - GOLD_STAT_NERF)
  }
  const overall = Math.min(GOLD_OVR_CAP, overallFromStats(stats))
  return { ...player, stats, overall }
}

/** Icons enter the forge unpolished — mini-games build them up toward legend ratings. */
function prepareIconForForge(player: RealPlayer): RealPlayer {
  const stats = {} as PlayerStats
  for (const key of STAT_KEYS) {
    stats[key] = Math.max(55, player.stats[key] - ICON_FORGE_NERF)
  }
  const overall = Math.min(ICON_FORGE_OVR_CAP, overallFromStats(stats))
  return { ...player, stats, overall }
}

export const RARITY_RANGES: Record<PackRarity, { min: number; max: number }> = {
  bronze: { min: 60, max: 74 },
  silver: { min: 75, max: 82 },
  gold:   { min: 83, max: 88 },
  icon:   { min: 89, max: 99 },
}

export function getRarityTier(overall: number): PackRarity {
  if (overall >= 89) return 'icon'
  if (overall >= 83) return 'gold'
  if (overall >= 75) return 'silver'
  return 'bronze'
}

export function getPackPlayers(rarity: PackRarity, count: number): RealPlayer[] {
  const { min, max } = RARITY_RANGES[rarity]

  if (rarity === 'icon') {
    const pool = ICON_LEGENDS.filter(p => p.overall >= min && p.overall <= max)
    const source = pool.length >= count ? pool : ICON_LEGENDS
    return [...source]
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map(prepareIconForForge)
  }

  const pool = PLAYERS.filter(p => !ICON_IDS.has(p.id) && p.overall >= min && p.overall <= max)
  const fallback = PLAYERS.filter(p => !ICON_IDS.has(p.id))
  const source = pool.length >= count ? pool : fallback

  return [...source]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(p => rarity === 'gold' ? toneDownForGoldPack(p) : p)
}

export function getStatColor(value: number): string {
  if (value >= 85) return '#00d26a'
  if (value >= 70) return '#95e06c'
  if (value >= 55) return '#ffd700'
  if (value >= 40) return '#ff9a3c'
  return '#ff4d4d'
}

export function getOverallColor(overall: number): string {
  if (overall >= 89) return '#f5d76e'
  if (overall >= 83) return '#ffd700'
  if (overall >= 75) return '#c0c0c0'
  return '#cd7f32'
}

export function getRarityColors(rarity: PackRarity) {
  return {
    bronze: { bg: 'from-amber-950 via-amber-800 to-gray-900', border: 'border-amber-600', text: '#cd7f32' },
    silver: { bg: 'from-gray-600 via-gray-700 to-gray-900',   border: 'border-gray-400',  text: '#c0c0c0' },
    gold:   { bg: 'from-yellow-900 via-yellow-800 to-gray-900', border: 'border-yellow-500', text: '#ffd700' },
    icon:   { bg: 'from-amber-700 via-yellow-600 to-gray-900', border: 'border-yellow-300', text: '#f5d76e' },
  }[rarity]
}

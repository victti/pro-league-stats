String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{([0-9]+)}/g, function (match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
}

const bayesSearchAPI = "https://lol.fandom.com/api.php?action=cargoquery&format=json&limit=max&tables=MatchScheduleGame%3DMSG%2C%20MatchSchedule%3DMS&fields=RiotPlatformGameId%2C%20Blue%2C%20Red%2C%20QQ%2C%20MSG.N_GameInMatch%3DGameNum%2C%20DateTime_UTC&where={0}&join_on=MSG.MatchId%3DMS.MatchId&order_by=MS.DateTime_UTC%20ASC";
const bayesGameAPI = "https://lol.fandom.com/api.php?action=query&format=json&prop=revisions&titles=V5%20data%3A{0}%7CV5%20data%3A{0}%2FTimeline&rvprop=content&rvslots=main";
const lplGameAPI = "https://open.tjstats.com/match-auth-app/open/v1/compound/matchDetail?matchId={0}";

async function GetBayesGames(leagueName, year, excludeList)
{
    let leaguepediaLeagueName = leagueName.toUpperCase();
    let query = "";
    let idNotNullFlag = leagueName != "LPL"; // Forma temporária de melhorar a Query de jogos que não são da LPL

    switch(leagueName)
    {
        case "WORLDS":
            query = `${leaguepediaLeagueName} ${year}%`;
            break;
        case "MSI":
            query = `${year} Mid-Season Invitational%`;
            break;
        case "NACL":
        case "North American Challengers League":
            query = `North American Challengers League/${year} Season/%`;
            break;
        default:
            query = `${leaguepediaLeagueName}/${year}%`
            break;
    }

    // query = query.format(leaguepediaLeagueName, year);

    let where = `MSG.OverviewPage LIKE '${query}'`;

    if(excludeList != undefined)
    {
        if(Array.isArray(excludeList))
        {
            for(let exclude in excludeList)
            {
                where += ` AND MSG.OverviewPage NOT LIKE '%${exclude}%'`;
            }
        } else if(excludeList != "") {
            where += ` AND MSG.OverviewPage NOT LIKE '%${excludeList}%'`;
        }
    }

    if(idNotNullFlag)
    {
        where += " AND MSG.RiotPlatformGameId != 1";
    }

    return await fetch(bayesSearchAPI.format(where), {}).then(resp => resp.json());
}

async function GetQqGame(matchId, gameNum)
{
    let matchDetails = { gameCreation: 0, gameDuration: 0, gameEndTimestamp: 0, gameMode: "CLASSIC", gameName: "", gameType: "CUSTOM_GAME", mapId: 11, participants: [], teams: [] };

    let qqGame = await GetCacheOrFetchGame(matchId);

    // TBD: refazer o json da riot usando esses dados LPL QQ

    let currentQqGame = qqGame.data.matchInfos[gameNum];

    if(currentQqGame == undefined)
        return { matchDetails: null };

    // Infos da partida
    matchDetails.gameCreation = new Date(currentQqGame.matchStartTime).getTime();
    matchDetails.gameDuration = currentQqGame.gameTime;
    matchDetails.gameEndTimestamp =  new Date(currentQqGame.matchEndTime).getTime();
    matchDetails.gameName = qqGame.data.matchName;

    // Sigla do time pra arrumar o nick dos jogadores, e colocar na ordem dos times tbm
    let blueTeamName = currentQqGame.blueTeam == qqGame.data.teamAId ? qqGame.data.teamAName : qqGame.data.teamBName;
    let redTeamName = blueTeamName == qqGame.data.teamAName ? qqGame.data.teamBName : qqGame.data.teamAName;

    let teamsName = [blueTeamName, redTeamName];

    // Players na ordem de time; blue 0-10 red
    let blueTeamIndex = currentQqGame.teamInfos[0].teamId == qqGame.data.teamAId ? 0 : 1;
    let redTeamIndex = blueTeamIndex == 0 ? 1 : 0;

    let teamsIndex = [blueTeamIndex, redTeamIndex];
    let teamsWin = [ currentQqGame.matchWin == currentQqGame.blueTeam, currentQqGame.matchWin != currentQqGame.blueTeam ];

    for(let teamIndex of teamsIndex)
    {
        let isBlueTeam = teamIndex == blueTeamIndex;

        for(let player of currentQqGame.teamInfos[teamIndex].playerInfos)
        {
            // TBD: runas
            let playerData = { assists: player.battleDetail.assist, champLevel: player.otherDetail.level, championId: player.heroId, championName: "", damageDealtToBuildings: 0, damageDealtToObjectives: 0, damageDealtToTurrets: 0, damageSelfMitigated: 0, deaths: player.battleDetail.death, goldEarned: player.otherDetail.golds, goldSpent: player.otherDetail.spentGold, iteam0: 0, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: player.trinketItem.itemId, kills: player.battleDetail.kills, largestCriticalStrike: player.damageDetail.highestCritDamage, largestKillingSpree: player.battleDetail.highestKillStreak, largestMultiKill: player.battleDetail.highestMultiKill, lane: player.playerLocation, magicDamageDealt: player.damageDetail.totalMagicalDamage, magicDamageDealtToChampions: player.damageDetail.heroMagicalDamage, magicDamageTaken: player.DamageTakenDetail.magicalDamageTaken, neutralMinionsKilled: player.otherDetail.totalNeutralMinKilled, participantId: matchDetails.participants.length + 1, perks: {}, physicalDamageDealt: player.damageDetail.totalPhysicalDamage, physicalDamageDealtToChampions: player.damageDetail.heroPhysicalDamage, physicalDamageTaken: player.DamageTakenDetail.physicalDamageTaken, riotIdGameName: "", role: player.playerLocation, spell1Id: player.spell1id, spell2Id: player.spell2id, teamId: isBlueTeam ? 100 : 200, totalAllyJungleMinionsKilled: player.otherDetail.totalMinKilledYourJungle, totalDamageDealt: player.damageDetail.totalDamage, totalDamageDealtToChampions: player.damageDetail.heroDamage, totalDamageShieldedOnTeammates: 0, totalDamageTaken: player.DamageTakenDetail.damageTaken, totalEnemyJungleMinionsKilled: player.otherDetail.totalMinKilledEnemyJungle, totalHeal: 0, totalHealsOnTeammates: 0, totalMinionsKilled: player.minionKilled, totalTimeCCDealt: 0, totalTimeSpentDead: player.otherDetail.deathTime, totalUnitsHealed: 0, trueDamageDealt: player.damageDetail.totalTrueDamage, trueDamageDealtToChampions: player.damageDetail.heroTrueDamage, trueDamageTaken: player.DamageTakenDetail.trueDamageTaken, turretKills: player.otherDetail.turretAmount, turretTakedowns: 0, turretsLost: 0, visionScore: player.visionDetail.visionScore, visionWardsBoughtInGame: player.visionDetail.controlWardPurchased, wardsKilled: player.visionDetail.wardKilled, wardsPlaced: player.visionDetail.wardPlaced, win: teamsWin[teamIndex] };

            playerData.championName = await getChampionName(player.heroId);

            for(let itemIndex in player.items)
            {
                playerData["item" + itemIndex] = player.items[itemIndex].itemId;
            }

            playerData.riotIdGameName = teamsName[teamIndex] + " " + player.playerName.replace(teamsName[teamIndex], "");

            matchDetails.participants.push(playerData);
        }

        let teamData = { bans: [], objectives: { baron: {first: false, kills: currentQqGame.teamInfos[teamIndex].baronAmount}, champion: {first: false, kills: currentQqGame.teamInfos[teamIndex].kills}, dragon: {first: currentQqGame.teamInfos[teamIndex].isFirstDragon, kills: currentQqGame.teamInfos[teamIndex].dragonAmount}, inhibitor: {first: currentQqGame.teamInfos[teamIndex].isFirstInhibitor, kills: currentQqGame.teamInfos[teamIndex].inhibitKills}, riftHerald: {first: currentQqGame.teamInfos[teamIndex].isFirstRiftHerald, kills: currentQqGame.teamInfos[teamIndex].isFirstRiftHerald ? 1 : 0}, tower: {first: currentQqGame.teamInfos[teamIndex].isFirstTurret, kills: currentQqGame.teamInfos[teamIndex].turretAmount}, horde: {first: false, kills: 0} }, teamId: isBlueTeam ? 100 : 200, win: teamsWin[teamIndex] };
        
        for(let banIndex in currentQqGame.teamInfos[teamIndex].banHeroList)
        {
            let pickTurn = 1;
            switch(banIndex)
            {
                case 0:
                    pickTurn = isBlueTeam ? 1 : 2;
                    break;
                case 1:
                    pickTurn = isBlueTeam ? 3 : 4;
                    break;
                case 2:
                    pickTurn = isBlueTeam ? 5 : 6;
                    break;
                case 3:
                    pickTurn = isBlueTeam ? 2 : 1;
                    break;
                case 4:
                    pickTurn = isBlueTeam ? 4 : 3;
                    break;
            }

            teamData.bans.push({pickTurn, championId: currentQqGame.teamInfos[teamIndex].banHeroList[banIndex]});
        }

        matchDetails.teams.push(teamData);
    }

    return { matchDetails, timelineDetails: {frameInterval: 60000, frames: []} };
}

async function GetBayersGame(RiotGameID)
{
    let matchDetails = null;
    let timelineDetails = null;

    let bayesGame = await GetCacheOrFetchGame(RiotGameID);

    for(let pageNum in bayesGame.query.pages)
    {
        let page = bayesGame.query.pages[pageNum];

        if(page.title.includes("Timeline"))
        {
            timelineDetails =  page.revisions != undefined ? JSON.parse(page.revisions[0].slots.main["*"]) : null;
            continue;
        }

        matchDetails = page.revisions != undefined ? JSON.parse(page.revisions[0].slots.main["*"]) : null;
    }

    return { matchDetails, timelineDetails};
}

async function GetCacheOrFetchGame(RiotGameID)
{
    const fs = require('fs').promises;

    try {
        let fileData = await fs.readFile(`.cache/${RiotGameID}.json`);

        return JSON.parse(fileData);
    } catch {
        let json = isNaN(RiotGameID) ? await fetch(bayesGameAPI.format(RiotGameID), {}).then(resp => resp.json()) : await fetch(lplGameAPI.format(RiotGameID), {headers:{"Authorization": "7935be4c41d8760a28c05581a7b1f570"}}).then(resp => resp.json());

        await fs.writeFile(`.cache/${RiotGameID}.json`, JSON.stringify(json), 'utf8');

        return json;
    }
}

let championsJson = null;

async function getChampionName(id)
{
    if(championsJson == null)
    {
        championsJson = await fetch("http://ddragon.leagueoflegends.com/cdn/14.4.1/data/en_US/champion.json", {}).then(resp => resp.json());
    }

    for(let champion in championsJson.data)
    {
        if(parseInt(championsJson.data[champion].key) == id)
            return championsJson.data[champion].name;
    }
}

function fmtMSS(s){return(s-(s%=60))/60+(9<s?':':':0')+s}

function nFormatter(num, digits) {
    var si = [
      { value: 1, symbol: "" },
      { value: 1E3, symbol: "K" },
      { value: 1E6, symbol: "M" },
      { value: 1E9, symbol: "G" },
      { value: 1E12, symbol: "T" },
      { value: 1E15, symbol: "P" },
      { value: 1E18, symbol: "E" }
    ];
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var i;
    // for negative value is work
    for (i = si.length - 1; i > 0; i--) {
      if (Math.abs(num) >= si[i].value) {
        break;
      }
    }
    return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
}

module.exports = { GetBayesGames, GetBayersGame, GetQqGame, fmtMSS, nFormatter }
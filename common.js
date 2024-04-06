String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{([0-9]+)}/g, function (match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
}

const bayesSearchAPI = "https://lol.fandom.com/api.php?action=cargoquery&format=json&limit=max&tables=MatchScheduleGame%3DMSG%2C%20MatchSchedule%3DMS&fields=RiotPlatformGameId%2C%20Blue%2C%20Red%2C%20QQ%2C%20MSG.N_GameInMatch%3DGameNum%2C%20DateTime_UTC&where={0}&join_on=MSG.MatchId%3DMS.MatchId&order_by=MS.DateTime_UTC%20ASC";
const bayesGameAPI = "https://lol.fandom.com/api.php?action=query&format=json&prop=revisions&titles=V5%20data%3A{0}%7CV5%20data%3A{0}%2FTimeline&rvprop=content&rvslots=main";
const lplGameAPI = "https://open.tjstats.com/match-auth-app/open/v1/compound/matchDetail?matchId={0}";

async function GetBayesGamesDEPRECATED(leagueName, year, excludeList)
{
    let leaguepediaLeagueName = leagueName.toUpperCase();
    let query = "";
    let idNotNullFlag = leagueName != "LPL" && leagueName != "LDL"; // Forma temporária de melhorar a Query de jogos que não são da LPL/LDL

    switch(leagueName)
    {
        case "WORLDS":
            query = `${leaguepediaLeagueName} ${year}%`;
            break;
        case "MSI":
        case "Mid-Season Invitational":
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
            for(let exclude of excludeList)
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

async function GetBayesGames(leagueNames, year, excludeList)
{
    let where = "(";

    let leagues = leagueNames;
    if(!Array.isArray(leagues))
    {
        leagues = [leagues];
    }

    for(let leagueName of leagues)
    {
        if(where != "(")
            where += " OR ";

        let leaguepediaLeagueName = leagueName.toUpperCase();
        let query = "";
        let idNotNullFlag = leagueName != "LPL" && leagueName != "LDL"; // Forma temporária de melhorar a Query de jogos que não são da LPL/LDL
    
        switch(leagueName)
        {
            case "WORLDS":
                query = `${leaguepediaLeagueName} ${year}%`;
                break;
            case "MSI":
            case "Mid-Season Invitational":
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
    
        where += `(MSG.OverviewPage LIKE '${query}'`;
    
        if(idNotNullFlag)
        {
            where += " AND MSG.RiotPlatformGameId != 1";
        } else {
            where += " AND MS.QQ != 1";
        }

        where += ")";
    }

    where += ")";

    if(excludeList != undefined)
    {
        if(Array.isArray(excludeList))
        {
            for(let exclude of excludeList)
            {
                where += ` AND MSG.OverviewPage NOT LIKE '%${exclude}%'`;
            }
        } else if(excludeList != "") {
            where += ` AND MSG.OverviewPage NOT LIKE '%${excludeList}%'`;
        }
    }

    let response = await fetch(bayesSearchAPI.format(where), {}).then(resp => resp.json());

    if(response.cargoquery.length == response.limits.cargoquery)
    {
        let offset = response.cargoquery.length;

        while(true)
        {
            let loopResponse = await fetch(bayesSearchAPI.format(where) + `&offset=${offset}`, {}).then(resp => resp.json());

            response.limits.cargoquery += loopResponse.limits.cargoquery;
            response.cargoquery = response.cargoquery.concat(loopResponse.cargoquery);

            if(loopResponse.cargoquery.length < loopResponse.limits.cargoquery)
                break;

            offset += loopResponse.cargoquery.length;
        }
    }

    return response;
}

async function GetQqGame(matchId, gameNum)
{
    let matchDetails = { gameCreation: 0, gameDuration: 0, gameEndTimestamp: 0, gameMode: "CLASSIC", gameName: "", gameType: "CUSTOM_GAME", mapId: 11, participants: [], teams: [] };
    let timelineDetails = {frameInterval: 60000, frames: []};

    let qqGame = await GetCacheOrFetchGame(matchId);

    if(!qqGame.success)
        return { matchDetails: null };

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
    let teamsWin = [currentQqGame.matchWin == currentQqGame.blueTeam, currentQqGame.matchWin != currentQqGame.blueTeam];

    for(let teamIndex of teamsIndex)
    {
        let isBlueTeam = teamIndex == blueTeamIndex;
        let didFirstBlood = false;

        if(currentQqGame.teamInfos[teamIndex].dragonSpirit == true)
        {
            // Pra não embolar esse drake único com os normais da API oficial, esse se chama ELITE_MONSTER_KILL_LPL pra diferenciar
            let drakeFrame = { assistingParticipantIds: [], bounty: 0, killerId: 0, killerTeamId: isBlueTeam ? 100 : 200, monsterSubType: `${currentQqGame.teamInfos[teamIndex].dragonSpiritType.toUpperCase()}_DRAGON`, monsterType: "DRAGON", position: {x: 9866, y: 4414}, timestamp: 0, type: "ELITE_MONSTER_KILL_LPL" };
        
            timelineDetails.frames.push({ events:[drakeFrame] });
        }

        for(let player of currentQqGame.teamInfos[teamIndex].playerInfos)
        {
            // TBD: runas
            let playerData = { assists: player.battleDetail.assist, champLevel: player.otherDetail.level, championId: player.heroId, championName: "", damageDealtToBuildings: 0, damageDealtToObjectives: 0, damageDealtToTurrets: 0, damageSelfMitigated: 0, deaths: player.battleDetail.death, goldEarned: player.otherDetail.golds, goldSpent: player.otherDetail.spentGold, iteam0: 0, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: player.trinketItem.itemId, kills: player.battleDetail.kills, largestCriticalStrike: player.damageDetail.highestCritDamage, largestKillingSpree: player.battleDetail.highestKillStreak, largestMultiKill: player.battleDetail.highestMultiKill, lane: player.playerLocation, magicDamageDealt: player.damageDetail.totalMagicalDamage, magicDamageDealtToChampions: player.damageDetail.heroMagicalDamage, magicDamageTaken: player.DamageTakenDetail.magicalDamageTaken, neutralMinionsKilled: player.otherDetail.totalNeutralMinKilled, participantId: matchDetails.participants.length + 1, perks: {}, physicalDamageDealt: player.damageDetail.totalPhysicalDamage, physicalDamageDealtToChampions: player.damageDetail.heroPhysicalDamage, physicalDamageTaken: player.DamageTakenDetail.physicalDamageTaken, riotIdGameName: "", role: player.playerLocation, spell1Id: player.spell1id, spell2Id: player.spell2id, teamId: isBlueTeam ? 100 : 200, totalAllyJungleMinionsKilled: player.otherDetail.totalMinKilledYourJungle, totalDamageDealt: player.damageDetail.totalDamage, totalDamageDealtToChampions: player.damageDetail.heroDamage, totalDamageShieldedOnTeammates: 0, totalDamageTaken: player.DamageTakenDetail.damageTaken, totalEnemyJungleMinionsKilled: player.otherDetail.totalMinKilledEnemyJungle, totalHeal: 0, totalHealsOnTeammates: 0, totalMinionsKilled: player.minionKilled, totalTimeCCDealt: 0, totalTimeSpentDead: player.otherDetail.deathTime, totalUnitsHealed: 0, trueDamageDealt: player.damageDetail.totalTrueDamage, trueDamageDealtToChampions: player.damageDetail.heroTrueDamage, trueDamageTaken: player.DamageTakenDetail.trueDamageTaken, turretKills: player.otherDetail.turretAmount, turretTakedowns: 0, turretsLost: 0, visionScore: player.visionDetail.visionScore, visionWardsBoughtInGame: player.visionDetail.controlWardPurchased, wardsKilled: player.visionDetail.wardKilled, wardsPlaced: player.visionDetail.wardPlaced, win: teamsWin[teamIndex] };

            playerData.championName = await GetChampionName(player.heroId);

            for(let itemIndex in player.items)
            {
                playerData["item" + itemIndex] = player.items[itemIndex].itemId;
            }

            playerData.riotIdGameName = teamsName[teamIndex] + " " + player.playerName.replace(teamsName[teamIndex], "");

            if(player.otherDetail.firstBlood)
            {
                didFirstBlood = true;
            }

            matchDetails.participants.push(playerData);
        }

        let teamData = { bans: [], objectives: { baron: {first: false, kills: currentQqGame.teamInfos[teamIndex].baronAmount}, champion: {first: didFirstBlood, kills: currentQqGame.teamInfos[teamIndex].kills}, dragon: {first: currentQqGame.teamInfos[teamIndex].isFirstDragon, kills: currentQqGame.teamInfos[teamIndex].dragonAmount + currentQqGame.teamInfos[teamIndex].elderDragonAmount }, inhibitor: {first: currentQqGame.teamInfos[teamIndex].isFirstInhibitor, kills: currentQqGame.teamInfos[teamIndex].inhibitKills}, riftHerald: {first: currentQqGame.teamInfos[teamIndex].isFirstRiftHerald, kills: currentQqGame.teamInfos[teamIndex].isFirstRiftHerald ? 1 : 0}, tower: {first: currentQqGame.teamInfos[teamIndex].isFirstTurret, kills: currentQqGame.teamInfos[teamIndex].turretAmount}, horde: {first: false, kills: currentQqGame.teamInfos[teamIndex].voidGrubAmount != undefined ? currentQqGame.teamInfos[teamIndex].voidGrubAmount : 0} }, teamId: isBlueTeam ? 100 : 200, win: teamsWin[teamIndex] };
        
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

    return { matchDetails, timelineDetails };
}

async function GetGameData(entry)
{
    if(entry.RiotPlatformGameId == null)
    {
        if(entry.QQ == null)
        {
            return { matchDetails: null, timelineDetails: null };
        }

        return await GetQqGame(entry.QQ, Number(entry.GameNum) - 1);
    }

    return await GetBayersGame(entry.RiotPlatformGameId);
}

async function GetBayersGame(RiotPlatformGameId)
{
    let matchDetails = null;
    let timelineDetails = null;

    let bayesGame = await GetCacheOrFetchGame(RiotPlatformGameId);

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
        let isLPL = !isNaN(RiotGameID);
        let cache = false;

        let json = !isLPL ? await fetch(bayesGameAPI.format(RiotGameID), {}).then(resp => resp.json()) : await fetch(lplGameAPI.format(RiotGameID), {headers:{"Authorization": "7935be4c41d8760a28c05581a7b1f570"}}).then(resp => resp.json());

        // Só salvar se a série da LPL tiver acabado / Só salvar o jogo do leaguepedia se tiver os dois json
        if(isLPL)
        {
            cache = json.success == true && json.data.matchStatus == 2;
        } else {
            let pageNums = Object.keys(json.query.pages);

            cache = pageNums.length == 2 && Number(pageNums[0]) >= 0 && Number(pageNums[1]) >= 0;
        }

        if(cache)
        {
            await fs.writeFile(`.cache/${RiotGameID}.json`, JSON.stringify(json), 'utf8');
        }
        
        return json;
    }
}

let championsJson = {};

async function GetChampionName(id, lang = "en_US")
{
    if(championsJson[lang] == null)
    {
        championsJson[lang] = await fetch(`http://ddragon.leagueoflegends.com/cdn/14.4.1/data/${lang}/champion.json`, {}).then(resp => resp.json());
    }

    for(let champion in championsJson[lang].data)
    {
        if(parseInt(championsJson[lang].data[champion].key) == id)
            return championsJson[lang].data[champion].id;
    }
}

async function GetChampionNameById(id, lang = "en_US")
{
    if(championsJson[lang] == null)
    {
        championsJson[lang] = await fetch(`http://ddragon.leagueoflegends.com/cdn/14.4.1/data/${lang}/champion.json`, {}).then(resp => resp.json());
    }

    for(let champion in championsJson[lang].data)
    {
        if(championsJson[lang].data[champion].id == id)
            return championsJson[lang].data[champion].name;
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

module.exports = { GetBayesGames, GetGameData, GetBayersGame, GetQqGame, fmtMSS, nFormatter, GetChampionName, GetChampionNameById }
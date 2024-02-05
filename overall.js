const { GetBayesGames, GetBayersGame, fmtMSS, nFormatter } = require("./common");

const leagueNames = ["CBLOL"];

async function EntryPoint()
{
    let statistics = {};

    for(let league of leagueNames)
    {
        let bayesGames = await GetBayesGames(league, "2024");

        if(bayesGames.cargoquery == undefined)
            break;

        for(let entry of bayesGames.cargoquery)
        {
            if(entry.title.RiotPlatformGameId == null)
                continue;

            let bayesGame = await GetBayersGame(entry.title.RiotPlatformGameId);

            let matchDetails = null;
            let timelineDetails = null;

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

            if(matchDetails == null || timelineDetails == null)
                continue;

            let teams = [];
            let totalGold = 0;

            for(let participant of matchDetails.participants)
            {
                let teamCode = participant.riotIdGameName.split(" ")[0];

                let teamId = participant.teamId;

                if(statistics[teamCode] == undefined)
                {
                    statistics[teamCode] = { games: 0, winrate: 0, gameTime: 0, "fb%": 0, "fvg%": 0, "frh%": 0, "ft%": 0, "fd%": 0, "fnash%": 0, gold: 0, kills: 0, deaths: 0, towers: 0, "c.gold": 0, "c.kills": 0, "c.towers": 0, "c.dragons": 0, "c.nashors": 0, "%towers > 11.5": 0, "%towers > 12.5": 0, "%dragons > 4.5": 0, "%dragons > 5.5": 0, "%nashors > 1.5" : 0, "%inhib > 1.5": 0 }
                }
            
                // Apenas primeira vez
                if(!teams.includes(teamCode))
                {
                    statistics[teamCode].games += 1;
                    statistics[teamCode].winrate += participant.win ? 1 : 0;
                    statistics[teamCode].gameTime += matchDetails.gameDuration;
    
                    let totalTowers = 0;
                    let totalDragons = 0;
                    let totalNashors = 0;
                    let totalInhib = 0;

                    for(let team of matchDetails.teams)
                    {
                        // Apenas um time
                        if(team.teamId == teamId)
                        {
                            statistics[teamCode]["fb%"] += team.objectives.champion.first ? 1 : 0;
                            statistics[teamCode]["fvg%"] += team.objectives.horde.first ? 1 : 0;
                            statistics[teamCode]["frh%"] += team.objectives.riftHerald.first ? 1 : 0;
                            statistics[teamCode]["ft%"] += team.objectives.tower.first ? 1 : 0;
                            statistics[teamCode]["fd%"] += team.objectives.dragon.first ? 1 : 0;
                            statistics[teamCode]["fnash%"] += team.objectives.baron.first ? 1 : 0;
    
                            statistics[teamCode].towers += team.objectives.tower.kills;
                        }

                        statistics[teamCode]["c.kills"] += team.objectives.champion.kills;
                        totalTowers += team.objectives.tower.kills;
                        totalDragons += team.objectives.dragon.kills;
                        totalNashors += team.objectives.baron.kills;
                        totalInhib += team.objectives.inhibitor.kills;
                    }

                    statistics[teamCode]["c.towers"] += totalTowers;
                    statistics[teamCode]["c.dragons"] += totalDragons;
                    statistics[teamCode]["c.nashors"] += totalNashors;

                    statistics[teamCode]["%towers > 11.5"] += totalTowers > 11 ? 1 : 0;
                    statistics[teamCode]["%towers > 12.5"] += totalTowers > 12 ? 1 : 0;
                    statistics[teamCode]["%dragons > 4.5"] += totalDragons > 4 ? 1 : 0;
                    statistics[teamCode]["%dragons > 5.5"] += totalDragons > 5 ? 1 : 0;
                    statistics[teamCode]["%nashors > 1.5"] += totalNashors > 1 ? 1 : 0;
                    statistics[teamCode]["%inhib > 1.5"] += totalInhib > 1 ? 1 : 0;
    
                    teams.push(teamCode);
                }

                statistics[teamCode].gold += participant.goldEarned;
                statistics[teamCode].kills += participant.kills;
                statistics[teamCode].deaths += participant.deaths;

                totalGold += participant.goldEarned;
            }

            for(let team of teams)
            {
                statistics[team]["c.gold"] += totalGold;
            }
        }
    }

    //#region Calculo de porcentagens

    for(let team in statistics)
    {
        statistics[team].winrate = ((statistics[team].winrate / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team].gameTime = "Média de tempo: " + fmtMSS(statistics[team].gameTime / statistics[team].games);

        statistics[team]["fb%"] = ((statistics[team]["fb%"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["fvg%"] = ((statistics[team]["fvg%"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["frh%"] = ((statistics[team]["frh%"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["ft%"] = ((statistics[team]["ft%"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["fd%"] = ((statistics[team]["fd%"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["fnash%"] = ((statistics[team]["fnash%"] / statistics[team].games) * 100).toFixed(1) + "%";

        statistics[team].gold = nFormatter(statistics[team].gold / statistics[team].games, 2);
        statistics[team].kills = parseFloat((statistics[team].kills / statistics[team].games).toFixed(2));
        statistics[team].deaths = parseFloat((statistics[team].deaths / statistics[team].games).toFixed(2));
        statistics[team].towers = parseFloat((statistics[team].towers / statistics[team].games).toFixed(2));

        statistics[team]["c.gold"] = nFormatter(statistics[team]["c.gold"] / statistics[team].games, 2);
        statistics[team]["c.kills"] = parseFloat((statistics[team]["c.kills"] / statistics[team].games).toFixed(2));
        statistics[team]["c.towers"] = parseFloat((statistics[team]["c.towers"] / statistics[team].games).toFixed(2));
        statistics[team]["c.dragons"] = parseFloat((statistics[team]["c.dragons"] / statistics[team].games).toFixed(2));
        statistics[team]["c.nashors"] = parseFloat((statistics[team]["c.nashors"] / statistics[team].games).toFixed(2));

        statistics[team]["%towers > 11.5"] = ((statistics[team]["%towers > 11.5"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["%towers > 12.5"] = ((statistics[team]["%towers > 12.5"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["%dragons > 4.5"] = ((statistics[team]["%dragons > 4.5"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["%dragons > 5.5"] = ((statistics[team]["%dragons > 5.5"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["%nashors > 1.5"] = ((statistics[team]["%nashors > 1.5"] / statistics[team].games) * 100).toFixed(1) + "%";
        statistics[team]["%inhib > 1.5"] = ((statistics[team]["%inhib > 1.5"] / statistics[team].games) * 100).toFixed(1) + "%";
    }

    //#endregion

    console.log(statistics);
}

EntryPoint();
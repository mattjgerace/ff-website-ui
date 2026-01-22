<script setup lang="ts">
import { Ref,  nextTick, onMounted, ref, watch } from 'vue'
import ffWebsiteAPI from '@/services/ff-website-api';

const props = defineProps(['year'])

interface lbdataInfo {
id: number,
team_id: number
championships: number,
standing: number,
avgstanding: number,
first_name: string,
last_name: string,
full_name: string,
wins: number,
losses: number,
ties: number,
pf: number,
pa: number,
diff: number,
weeks_won: number,
seasons_won: number,
seed: number,
avgseed: number,
draft_pick: number,
avgdraft_pick: number,
}

interface mdataInfo {
  team_id: number,
  season: number,
  week: number,
  playoff: boolean,
  first_name: string,
  last_name: string,
  full_name: string,
  wins: number,
  losses: number,
  ties: number,
  score: number,
  opp_score: number,
}

const tabledata: Ref<Array<lbdataInfo> | null> = ref(null);
const bracketdata: Ref<any | null> = ref(null);
const settingdata: Ref<Array<any> | null> = ref(null);
const matchupsdata: Ref<Array<mdataInfo> | null> = ref(null);

const teamMap = new Map<number, lbdataInfo>();
const scoreMap = new Map<number, Map<number, number>>();

let team_num = 6
let playoff_week_start = 15


onMounted(() => {
  ffWebsiteAPI.ready = new Promise(resolve => {
      ffWebsiteAPI.resolver = resolve;
  });
  ffWebsiteAPI.resolver(1)
  fetchBracket();
});

function buildBracket(matchupsdata_value: mdataInfo[]) {
  if (tabledata.value != null) {
    //let reseed = true;
    let bracket : (lbdataInfo | undefined)[][][] = [[[], [], [], []], [[], []], [[]]];
    let team_counter = 0;
    tabledata.value.forEach((team: lbdataInfo) => {
        if (team.seed <= team_num && team.seed != null) {
          teamMap.set(team.seed, team)
          scoreMap.set(team.team_id, new Map<number, number>())
        }
        else {
          let null_team: lbdataInfo = {
                team_id: 0,
                full_name: ' ',
                standing: 0,
                seed: team_num - team_counter,
            };
          if (team_counter < team_num) {
            teamMap.set(team_num - team_counter, null_team)
          }
        }
        team_counter++
    });

    matchupsdata_value.forEach((matchup: mdataInfo) => {
      scoreMap.get(matchup.team_id)?.set(matchup.week, matchup.score)
    });

    var team_data: lbdataInfo | undefined = undefined;

    for (let i = 0; i < (8/2); i++) {
      bracket[0][i] = [team_data, team_data]
      bracket[0][i][0] = (teamMap.get(i+1))
      bracket[0][i][1] = (teamMap.get(8-i))
    }
    
    for (let round_no = 0; round_no < bracket.length-1; round_no++) {
      bracket[round_no].reverse()
      let top_seed: (lbdataInfo | undefined)[] | undefined = bracket[round_no].pop();
      if (top_seed != undefined) {
        bracket[round_no].unshift(top_seed)
      }
      
      for (let i = 0; i < bracket[round_no].length; i++) {
        let is_odd = (i) % 2
        if (round_no == 0) {
          if (is_odd !== 0) {
            bracket[round_no][i].reverse();
          }
        }
        let winner: lbdataInfo | undefined;
        winner = findWinner(bracket[round_no][i], round_no);
        (i > 1) ? bracket[round_no+1][i-is_odd-1][is_odd] = winner : bracket[round_no+1][i-is_odd][is_odd] = winner
      }
    }
    return bracket
  }
}


async function fetchBracket() {
    try {
      const leaderboard_response = await ffWebsiteAPI.getLeaderboard(props.year);
      tabledata.value = leaderboard_response;
      const settings_response = await ffWebsiteAPI.getSettings(props.year);
      settingdata.value = settings_response[0];
      const matchups_response = await ffWebsiteAPI.getMatchups(props.year, null, null, 1)
      matchupsdata.value = matchups_response;
      await nextTick()
      if (matchupsdata.value != undefined) {
        bracketdata.value = buildBracket(matchupsdata.value);
      }
    }
    catch (e) {
      console.log(e)
    }
}

watch(() => props.year, () => {
  fetchBracket();
})

function findScore(team1: lbdataInfo | undefined, team2: lbdataInfo | undefined, round_index: number) : string | undefined {
  if (team1 == undefined || team2 == undefined) {
    return ""
  }
  else {
    if (teamMap.has(team1.seed)) {
      var team = teamMap.get(team1.seed)
      if (team != undefined) {
        var team_scores = scoreMap.get(team.team_id)
        if (team_scores != undefined && team_scores.has(playoff_week_start+round_index)) {
          return Number((team_scores?.get(playoff_week_start+round_index)))?.toFixed(2)
        }
      }
    }
    return undefined
  }
}

function findWinner(matchup: (lbdataInfo| undefined)[], round_index: number): (lbdataInfo | undefined) {
  let team1 = matchup[0]
  let team2 = matchup[1]
  if (team1 == undefined || team2 == undefined) {
        return (team1 == undefined) ? team2 : team1
  }
  else {
        if (findScore(team1, team2, round_index) != undefined) {
          if (Number(findScore(team1, team2, round_index)) > Number(findScore(team2, team1, round_index))) {
            return team1;
          }
          else {
            return team2;
          }
        }
        else {
          let null_team: lbdataInfo = {
                team_id: 0,
                full_name: '',
                standing: 0,
                seed: 0,
            };
          return null_team;
        }
    }
}

function findLoser(matchup: (lbdataInfo | undefined)[], round_index: number): (lbdataInfo) {
  let team1 = matchup[0]
  let team2 = matchup[1]
  if (findScore(team1, team2, round_index) != undefined) {
    if (Number(findScore(team1, team2, round_index)) > Number(findScore(team2, team1, round_index))) {
      return team2;
    }
    else {
      return team1;
    }
  }
  else {
    let null_team: lbdataInfo = {
                team_id: 0,
                full_name: '',
                standing: 0,
                seed: 0,
            };
    return null_team;
  }
}

function findThirdPlaceMathcup(bracket: (lbdataInfo | undefined)[] | undefined): (lbdataInfo | undefined)[]  {
  if (bracket != undefined) {
    let team1 = findLoser(bracket[bracket.length-2][0], bracket.length-2)
    let team2 = findLoser(bracket[bracket.length-2][1], bracket.length-2)
    return [team1, team2]
  }
  else {
    return [undefined, undefined]
  }
}

function findTeam(team: lbdataInfo | undefined) : string {
  if (team !== undefined) {
    return (team.full_name != "") ? `(${team.seed}) ${team.full_name}` : ""
  }
  else {
    return '\u00A0\u00A0\u00A0BYE';
  }
}

</script>

<template>
  <h2>{{year}} Playoff Bracket</h2>
  <main id="tournament" v-if="bracketdata">
  <ul v-for="(round, round_index) in bracketdata" :key="round_index" class="round">
    <li class="spacer">&nbsp;</li>
    <template v-for="(game, game_index) in round" :key="game_index">
      <li :class="[(round.length != 1) ? 'game game-top' :  (game[0] != undefined && (findLoser(game, Number(round_index)).seed == game[0].seed)) ? 'game game-top second' : 'game game-top', (game[0] != undefined && findWinner(game, Number(round_index)) != undefined && game != undefined && (findWinner(game, Number(round_index)).seed == game[0].seed)) ? 'game winner' : 'game']">{{findTeam(game[0])}}<span>{{findScore(game[0], game[1], Number(round_index))}}</span></li>
      <li class="game game-spacer">&nbsp;</li>
      <li :class="[(round.length != 1) ? 'game game-bottom' : (game[1] != undefined && (findLoser(game, Number(round_index)).seed == game[1].seed)) ? 'game game-bottom second' : 'game game-bottom', (game[1] != undefined && (findWinner(game, Number(round_index)) != undefined) && game != undefined && (findWinner(game, Number(round_index)).seed == game[1].seed)) ? 'game winner' : 'game']">{{findTeam(game[1])}}<span>{{findScore(game[1], game[0], Number(round_index))}}</span></li>
      <li class="spacer">&nbsp;</li>
    </template>
  </ul>
  <ul class="round round-4" v-if="bracketdata">
      <li class="game game-top champion">{{findTeam(findWinner(bracketdata[bracketdata.length-1][0], bracketdata.length-1))}}</li>
  </ul>
  </main>
  <main id="tournament" v-if="bracketdata">
       <!-- 3rd Place -->
       <ul class="round round-1"></ul>
       <ul class="round round-2"></ul>
       <ul class="round round-3">
       <li class="spacer">&nbsp;</li>
  
        <li :class="['game game-top', ((findThirdPlaceMathcup(bracketdata)[0] != undefined) && (findWinner(findThirdPlaceMathcup(bracketdata), bracketdata.length-1).seed == (findThirdPlaceMathcup(bracketdata)[0]).seed)) ? 'game winner' : 'game']">{{findTeam(findThirdPlaceMathcup(bracketdata)[0])}} <span>{{findScore(findThirdPlaceMathcup(bracketdata)[0], findThirdPlaceMathcup(bracketdata)[1], bracketdata.length-1)}}</span></li>

        <li class="game game-spacer">&nbsp;</li>

        <li :class="['game game-bottom', (findThirdPlaceMathcup(bracketdata)[1] != undefined && (findWinner(findThirdPlaceMathcup(bracketdata), bracketdata.length-1).seed == (findThirdPlaceMathcup(bracketdata)[1]).seed)) ? 'game winner' : 'game']">{{findTeam(findThirdPlaceMathcup(bracketdata)[1])}}<span>{{findScore(findThirdPlaceMathcup(bracketdata)[1], findThirdPlaceMathcup(bracketdata)[0], bracketdata.length-1)}}</span></li>
  
         <li class="spacer">&nbsp;</li>
       </ul>
       <ul class="round round-4">
         <li class="game game-top third">{{ findTeam(findWinner(findThirdPlaceMathcup(bracketdata), bracketdata.length-1)) }}</li>
       </ul>
  </main>
</template>

<style scoped>
main{
  display:flex;
  flex-direction:row;
}
.round{
  display:flex;
  flex-direction:column;
  justify-content:center;
  width:275px;
  list-style:none;
  padding:0;
}
  .round .spacer{ flex-grow:1; }
  .round .spacer:first-child,
  .round .spacer:last-child{ flex-grow: 0.5; }

  .round .game-spacer{
    flex-grow:1;
  }

/*
 *  General Styles
*/
body{
  font-family:sans-serif;
  font-size:small;
  padding:10px;
  line-height:1.4em;
}

li.game{
  padding-left:20px;
}

  li.game.winner{
    /* font-weight:bold; */
    font-style: italic;
  }
  li.game.champion{
    color: goldenrod;
  }
  li.game.second{
    color: silver;
  }
  li.game.third{
    color: #CD7F32;
  }
  li.game span{
    float:right;
    margin-right:5px;
  }

  li.game-top{ border-bottom:1px solid #aaa; }

  li.game-spacer{ 
    border-right:1px solid #aaa;
    min-height:40px;
  }

  li.game-bottom{ 
    border-top:1px solid #aaa;
  }
  h2 {
    margin-left: 5px;
  }
</style>
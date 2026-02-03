<script setup lang="ts">

import {ref, nextTick, watch, Ref } from 'vue'

import { onMounted } from 'vue'
import ffWebsiteAPI from '../../services/ff-website-api'

const props = defineProps(['year', 'lowerWeek', 'higherWeek', 'playoffWeek', 'maxHighWeek', 'stat', 'ppg', 'per'])
const emit = defineEmits<{(e: 'update-values', values: { stat?: string; lowerWeek?: number; higherWeek?: number; maxHighWeek?: number; }): void;}>();


interface lbdataInfo {
  team_id: number,
  championships: number,
  standing: number,
  avgstanding: number,
  first_name: string,
  last_name: string,
  full_name: string,
  wins: number,
  losses: number,
  ties: number,
  record: string,
  division: string,
  division_standing: number,
  pf: number,
  pa: number,
  diff: number,
  weeks_won: number,
  seasons_won: number,
  divisions_won: number,
  seed: number,
  avgseed: number,
  draft_pick: number,
  avgdraft_pick: number,
  playoff_week_start: number,
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
const matchupsdata: Ref<Array<mdataInfo> | null> = ref(null);

const loading = ref(false);

onMounted(() => {
  ffWebsiteAPI.ready = new Promise(resolve => {
      ffWebsiteAPI.resolver = resolve;
  });
  ffWebsiteAPI.resolver(1)
  fetchLeaderboard();
});

async function fetchLeaderboard() {
    try { 
      const response = await ffWebsiteAPI.getLeaderboard(props.year);
      tabledata.value = response;
      if (response.length!=0) {
        loading.value = true;
        await fetchMatchups()
      }
      await nextTick()
      //console.log(tabledata.value)
    }
    catch (e) {
      console.log(e)
    }
    finally {
      loading.value = false;
    }
}

async function fetchMatchups() {
    try { 
      let stat = null;
      switch(props.stat) { 
        case ("Regular Season"): { 
            stat = 0;
            break; 
        } 
        case ("Postseason"): { 
            stat = 1; 
            break; 
        } 
        default: {
            break; 
        } 
      }

      let response :  mdataInfo[] | null;
      if (props.year=='All Time' || props.year=='Year:') {
        response = await ffWebsiteAPI.getMatchups(null, null, null, stat);
      }
      else {
        response = await ffWebsiteAPI.getMatchups(props.year, props.lowerWeek, props.higherWeek, stat);
      }
      matchupsdata.value = response

      if (matchupsdata.value != null && tabledata.value != null) {
        if (props.year=='All Time' || props.year=='Year:') {
          processMatchupDataAllTime(matchupsdata.value, tabledata.value)
        }
        else {
          processMatchupDataYear(matchupsdata.value, tabledata.value)
        }
      }
    }
    catch (e) {
      console.log(e)
    }
}

function getValue(team: Map<string, number>, field: string): number {
  if (team.has(field)) {
    var value = team.get(field)
  }
  return (value != undefined) ? value : 0
}

function processMatchupDataAllTime(matchupsdata_value: mdataInfo[], tabledata_value:lbdataInfo[]) {
  let teamMap = new Map<number, Map<string, number>>();
  let seasonMap = new Map<number, Map<string, Map<number, number>>>();

  matchupsdata_value.forEach(matchup => {
    if (!teamMap.has(matchup.team_id)) {
      teamMap.set(matchup.team_id, new Map<string, number>([["pf", 0.00], ["pa", 0.00], ["wins", 0], ["losses", 0], ["ties", 0], ["year_won", 0]]))
    }
    if (!seasonMap.has(matchup.season)) {
      seasonMap.set(matchup.season, new Map<string, Map<number, number>>([["pf", new Map<number, number>([[matchup.team_id, 0.00]])]]))
    }
    if (!seasonMap.get(matchup.season)?.get("pf")?.has(matchup.team_id)) {
      seasonMap.get(matchup.season)?.get("pf")?.set(matchup.team_id, 0.00)
    }
    
    var season_pf = Number(seasonMap.get(matchup.season)?.get("pf")?.get(matchup.team_id)) + matchup.score
    seasonMap.get(matchup.season)?.get("pf")?.set(matchup.team_id, season_pf)

    var team = teamMap.get(matchup.team_id)
    if (team != undefined) {

      let pf = Number(getValue(team, "pf")+Number(matchup.score))
      let pa = Number(getValue(team, "pa")+Number(matchup.opp_score))
      let wins: number = getValue(team, "wins")+matchup.wins
      let losses: number = getValue(team, "losses")+matchup.losses
      let ties: number = getValue(team, "ties")+matchup.ties
      team.set("pf", pf)
      team.set("pa", pa)
      team.set("wins", wins)
      team.set("losses", losses)
      team.set("ties", ties)
    }
  });

// let map_2024 = seasonMap.get(2024)?.get("pf")

// let winner_2024 = Array.from(map_2024.entries()).reduce((a, b) => a[1] < b[1] ? b : a)[0];

// console.log(teamMap);

  tabledata_value.forEach(lb => {

    // lb.seasons_won = 0
    // if (lb.team_id == winner_2023) {
    //   lb.seasons_won = lb.seasons_won + 1
    // }
    var team = teamMap.get(lb.team_id)
    if (team != undefined) {
      lb.pf = getValue(team, "pf")
      lb.pa = getValue(team, "pa")
      lb.wins = getValue(team, "wins");
      lb.losses = getValue(team, "losses")
      lb.ties = getValue(team, "ties")
      lb.record = (lb.ties == 0) ? `${lb.wins}-${lb.losses}` : `${lb.wins}-${lb.losses}-${lb.ties}`
    }
    });
    tabledata.value = tabledata_value
  }

function processMatchupDataYear(matchupsdata_value: mdataInfo[], tabledata_value:lbdataInfo[]) {
  let teamMap = new Map<number, Map<string, number>>();
  var weeks: Array<number> = []
  matchupsdata_value.forEach(matchup => {
    if (!teamMap.has(matchup.team_id)) {
      console.log(matchup.team_id)
      teamMap.set(matchup.team_id, new Map<string, number>([["pf", 0.00], ["pa", 0.00], ["wins", 0], ["losses", 0], ["ties", 0]]))
    }
    if (!weeks.includes(matchup.week)) {
      weeks.push(matchup.week)
    }
    var team = teamMap.get(matchup.team_id)
    if (team != undefined) {
      let pf = Number(getValue(team, "pf")+Number(matchup.score))
      let pa = Number(getValue(team, "pa")+Number(matchup.opp_score))
      let wins: number = getValue(team, "wins")+matchup.wins
      let losses: number = getValue(team, "losses")+matchup.losses
      let ties: number = getValue(team, "ties")+matchup.ties

      team.set("pf", pf)
      team.set("pa", pa)
      team.set("wins", wins)
      team.set("losses", losses)
      team.set("ties", ties)
    }
  });

  //emit('update-values', {maxHighWeek: Math.max(...weeks)},)

  tabledata_value.forEach(lb => {
    var team = teamMap.get(lb.team_id)
    if (team != undefined) {
      lb.pf = getValue(team, "pf")
      lb.pa = getValue(team, "pa")
      lb.wins = getValue(team, "wins");
      lb.losses = getValue(team, "losses")
      lb.ties = getValue(team, "ties")
      lb.record = (lb.ties == 0) ? `${lb.wins}-${lb.losses}` : `${lb.wins}-${lb.losses}-${lb.ties}`
    }
  });
  tabledata.value = tabledata_value
}

async function processColName (ppg: string | undefined, per: string | undefined) {
  colnames.value.combined.forEach(columnName => {
    if (columnName.colppg && ppg != undefined) {
      let nameppg = columnName.colppg
      columnName.colppg = columnName.col
      columnName.col = nameppg
    }
    else if (columnName.colper && per != undefined) {
      let nameper = columnName.colper
      columnName.colper = columnName.col
      columnName.col = nameper
    }
  })
  colnames.value.single.forEach(columnName => {
    if (columnName.colppg && ppg !=undefined) {
      let nameppg = columnName.colppg
      columnName.colppg = columnName.col
      columnName.col = nameppg
    }
    else if (columnName.colper && per != undefined) {
      let nameper = columnName.colper
      columnName.colper = columnName.col
      columnName.col = nameper
    }
  })
}

 function adjustStatOptions(low: number, high: number) {
  if (low < props.playoffWeek && high > props.playoffWeek-1 && high !== 100) {
    emit('update-values', {stat: "Combined"});
  }
  else if (low > props.playoffWeek-1 && high > props.playoffWeek-1) {
    emit('update-values', {stat: "Postseason"});
  }
  else if ((low < props.playoffWeek && high < props.playoffWeek) || (low < props.playoffWeek && high == 100)) {
    emit('update-values', {stat: "Regular Season"});
  }
}

function adjustWeekOptions(stat: string) {
  switch(stat) {
        case ("Regular Season"): { 
            emit('update-values', {
              lowerWeek: 1,
              higherWeek: props.playoffWeek-1,
            });
            break;
        }
        case ("Postseason"): { 
            emit('update-values', {
              lowerWeek: props.playoffWeek,
              higherWeek: props.playoffWeek+2,
            });
            break;
        } 
        default: {  
            emit('update-values', {
              lowerWeek: 1,
              higherWeek: props.playoffWeek+2,
            });
            break; 
        } 
    }
}

let internalUpdate = false;

watch(() => [props.stat, props.lowerWeek, props.higherWeek, props.year], 
async ([newStat, newLow, newHigh], [oldStat, oldLow, oldHigh]) => {
  if (internalUpdate) return;

  internalUpdate = true;

  if (oldLow != newLow) {
    adjustStatOptions(newLow, props.higherWeek)
  }
  else if (oldHigh != newHigh) {
    adjustStatOptions(props.lowerWeek, newHigh)
  }
  else {
    adjustWeekOptions(newStat)
  }

  await nextTick();
  internalUpdate = false;
  fetchLeaderboard();
  sortColumn.value = "id"
})

watch(()=> props.ppg, (newPPG) => {
  processColName(newPPG, undefined);
})

watch(()=> props.per, (newPER) => {
  processColName(undefined, newPER);
})

interface colNames {
  col: string; 
  colppg?: string;
  colper?: string
  sort: keyof lbdataInfo
} 

interface groupColNames {
  single: Array<colNames>,
  combined: Array<colNames>,
}

const colnames : Ref<groupColNames> = ref({
    single: [
          {col: "Final Standing", sort: "standing" as keyof lbdataInfo},
          //{col: "Division Standing", sort: "standing"},
          {col: "Team", sort: "team_id" as keyof lbdataInfo},
          {col: "Record", colper:"Winning %", sort: "wins" as keyof lbdataInfo},
          {col: "Division Standing", colper:"Division Standing", sort: "division" as keyof lbdataInfo},
          {col: "PF", colppg: "PPG", sort: "pf" as keyof lbdataInfo},
          {col: "PA", colppg: "PAPG", sort: "pa" as keyof lbdataInfo},
          {col: "DIFF", colppg: "DIFFPG", sort: "diff" as keyof lbdataInfo}, 
          {col: "Top Scoring Weeks", sort: "weeks_won" as keyof lbdataInfo},
          {col: "Playoff Seed", sort: "seed" as keyof lbdataInfo},
          {col: "Draft Pos.", sort: "draft_pick" as keyof lbdataInfo}
        ], 
  combined: [
          {col: "Championships", sort: "championships" as keyof lbdataInfo},
          {col: "Avg. Final Standing", sort: "avgstanding" as keyof lbdataInfo},
          //{col: "Avg. Seed", sort: "avgseed"},  
          {col: "Team", sort: "team_id" as keyof lbdataInfo},
          {col: "Record", colper:"Winning %", sort: "wins" as keyof lbdataInfo}, 
          {col: "PF", colppg: "PPG", sort: "pf" as keyof lbdataInfo}, 
          {col: "PA", colppg: "PAPG", sort: "pa" as keyof lbdataInfo},
          {col: "DIFF", colppg: "DIFFPG", sort: "diff" as keyof lbdataInfo},
          {col: "Top Scoring Seasons", sort: "seasons_won" as keyof lbdataInfo},
          {col: "Top Scoring Weeks", sort: "weeks_won" as keyof lbdataInfo},
          {col: "Division Titles", sort: "divisions_won" as keyof lbdataInfo},
          {col: "Avg. Draft Pos", sort: "avgdraft_pick" as keyof lbdataInfo}
        ]
})

const sortColumn = ref("id");
const sortDirection = ref(1);
const arrowIconName = ref("arrow_drop_up");
const sortByColumn = (columnName: keyof lbdataInfo) => {
    sortColumn.value = columnName;
    sortDirection.value = -1 * sortDirection.value;
    if (sortDirection.value == 1) {
        arrowIconName.value = "arrow_drop_up";
        if (tabledata.value) {
          if (columnName == 'diff') {
            tabledata.value.sort((a, b) => ((a['pf'] - a['pa']) > (b['pf'] - b['pa']) ? 1 : -1));
          }
          else if (columnName == 'pf' || columnName == 'pa') {
            tabledata.value.sort((a, b) => (Number(a[columnName]) > Number(b[columnName]) ? 1 : -1));
          }
          else {
            if (columnName == 'avgstanding' || columnName == 'standing' || columnName == 'seed' || columnName == 'avgdraft_pick' || columnName == 'draft_pick') {
              if (columnName == 'standing') {
                tabledata.value.sort((a, b) => {
                      const primaryA = Number(a[columnName]);
                      const primaryB = Number(b[columnName]);

                      if (primaryA < primaryB) return 1;
                      if (primaryA > primaryB) return -1;

                      const secondaryA = Number(a["seed"]);
                      const secondaryB = Number(b["seed"]);

                      if (secondaryA < secondaryB) return 1;
                      if (secondaryA > secondaryB) return -1;

                      return 0;
                    });
              }
              else {
                tabledata.value.sort((a, b) => (Number(a[columnName]) < Number(b[columnName]) ? 1 : -1));
              }
            }
            else {
              tabledata.value.sort((a, b) => (a[columnName] > b[columnName] ? 1 : -1));
            }
          }
        }
    } else {
        arrowIconName.value = "arrow_drop_down";
        if (tabledata.value) {
          if (columnName == 'diff') {
            tabledata.value.sort((a, b) => ((a['pf'] - a['pa']) < (b['pf'] - b['pa']) ? 1 : -1));
          }
          else if (columnName == 'pf' || columnName == 'pa') {
            tabledata.value.sort((a, b) => (Number(a[columnName]) < Number(b[columnName]) ? 1 : -1));
          }
          else {
            if (columnName =='division' || columnName == 'avgstanding' || columnName == 'standing' || columnName == 'seed' || columnName == 'avgdraft_pick' || columnName == 'draft_pick') {
              if (columnName == 'standing') {
                tabledata.value.sort((a, b) => {
                      return sortBackup(a, b, columnName, "seed", "number", "number")
                    });
                }
              else if (columnName == 'division') {
                tabledata.value.sort((a, b) => {
                      return sortBackup(a, b, columnName, "division_standing", "string", "number")
                    });
                }
              else {
                tabledata.value.sort((a, b) => (Number(a[columnName]) > Number(b[columnName]) ? 1 : -1));
              }
            }
            else {
              tabledata.value.sort((a, b) => (a[columnName] < b[columnName] ? 1 : -1));
            }
          }
        }
    }
}

const validate = (value: number | undefined): number => {
  if (value == undefined) {
    return 0 
  }
  else {
    return value
  }
}

const addSign = (value: number) => {
  if (value > 0) {
    return `+${(value.toFixed(2))}`
  }
  else {
    return `${(value).toFixed(2)}`
  }
}

const calcWinningPerc = (row : lbdataInfo) => {
  return ((row.wins+row.losses+row.ties) != 0) ? Number(row.wins / (row.wins+row.losses+row.ties)).toFixed(3) : "-"
}

const calcPointsPer = (row: lbdataInfo, value : number) => {
  return ((row.wins+row.losses+row.ties) != 0) ? (value / (row.wins+row.losses+row.ties)).toFixed(2) : "0.00"
}

const sortBackup = (a: lbdataInfo, b:lbdataInfo, primaryColumnName: keyof lbdataInfo, backupColumnName: keyof lbdataInfo, primaryType: string, backupType: string) => {
  const primaryA = (primaryType=="number") ? Number(a[primaryColumnName]) : a[primaryColumnName];
  const primaryB = (primaryType=="number") ? Number(b[primaryColumnName]) : b[primaryColumnName];

  if (primaryA < primaryB) return -1;
  if (primaryA > primaryB) return 1;

  const secondaryA = (backupType=="number") ? Number(a[backupColumnName]) : a[backupColumnName];
  const secondaryB =(backupType=="number") ? Number(b[backupColumnName]) : b[backupColumnName];

  if (secondaryA < secondaryB) return -1;
  if (secondaryA > secondaryB) return 1;

  return 0;
}

</script>

<template>
  <div v-if="loading" class="loading-overlay">
    <div class="spinner"></div>
  </div>
  <table v-else class="table table-light table-striped">
    <thead class="thead">
      <tr>
        <th v-for="names in ((props.year=='All Time' || props.year=='Year:') ? colnames.combined : colnames.single)" :key="names.col" @click="(names.col !== 'Team') ? sortByColumn(names.sort) : ''" class="thead" scope="col">
          {{ names.col }}
          <span v-if="sortColumn == names.sort && names.col != 'Team'" class="material-icons">{{
            arrowIconName
          }}</span>
          <span v-else class="material-icons">sort</span>
        </th>
      </tr>
    </thead>
    <tbody v-if="tabledata != null && (props.year=='All Time' || props.year=='Year:')">
      <tr v-for="row in tabledata" :key="row.team_id">
        <td>{{ Number(validate(row.championships).toString()) }}</td>
        <td>{{ validate(row.avgstanding) }}</td>
        <td>{{ (row.full_name !== undefined) ? `${(row.full_name)}`: "N/A" }}</td>
        <td>{{ (props.per) ? calcWinningPerc(row) : (row.record != null) ? (row.record) : (`${validate(row.wins)}-${validate(row.losses)}`) }}</td>
        <td>{{ (props.ppg) ? calcPointsPer(row, validate(row.pf)) : Number(validate(row.pf)).toFixed(2) }}</td>
        <td>{{ (props.ppg) ? calcPointsPer(row, validate(row.pa)) : Number(validate(row.pa)).toFixed(2)  }}</td>
        <td>{{ (props.ppg) ? addSign(Number(calcPointsPer(row, (validate(row.pf) - validate(row.pa))))) : addSign((validate(row.pf)- validate(row.pa))) }}</td>
        <td>{{ validate(row.seasons_won) }}</td>
        <td>{{ validate(row.weeks_won) }}</td>
        <td>{{ validate(row.divisions_won) }}</td>
        <td>{{ validate(row.avgdraft_pick)}}</td>
      </tr>
    </tbody>
    <tbody v-else-if="tabledata != null">
      <tr v-for="row in tabledata" :key="row.team_id">
        <td>{{ validate(row.standing) == 0 ? "-" : validate(row.standing)  }}</td>
        <!-- <td v-if="props.year != 2019">{{ "Blue" }}</td> -->
        <td>{{(row.full_name !== undefined) ? `${(row.full_name)}`: "N/A" }}</td>
        <td>{{ (props.per) ? calcWinningPerc(row) : (row.record != null) ? (row.record) : (`${validate(row.wins)}-${validate(row.losses)}`) }}</td>
        <td>{{ (row.division !== undefined) ? `${row.division} (${validate(row.division_standing)})` : "N/A" }}</td>
        <td>{{ (props.ppg) ? calcPointsPer(row, validate(row.pf)) : Number(validate(row.pf)).toFixed(2) }}</td>
        <td>{{ (props.ppg) ? calcPointsPer(row, validate(row.pa)) : Number(validate(row.pa)).toFixed(2)  }}</td>
        <td>{{ (props.ppg) ? addSign(Number(calcPointsPer(row, (validate(row.pf) - validate(row.pa))))) : addSign((validate(row.pf)- validate(row.pa))) }}</td>
        <td>{{ validate(row.weeks_won) }}</td>
        <td>{{ validate(row.seed) == 0 ? "-" : validate(row.seed)}}</td>
        <td>{{ validate(row.draft_pick) == 0 ? "-" : validate(row.draft_pick) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.material-icons {
    vertical-align: -6px;
}

th {
    cursor: pointer;
}

.select {
  margin-bottom: 15px;
}
#year {
  margin-right: 5px;
}
#stats {
  margin-right: 5px;
}
#avg {
  font-size:12px;
  padding-bottom: -5px;
  width:124px;
}
#perc {
  font-size:12px;
  padding-bottom: -5px;
  width: 90px;
  margin-left: 5px;
}
#draft {
height:35px;
width:200px;
font-size: 15px;
float:right;
}
#brac {
height:35px;
width:200px;
font-size: 15px;
float:right;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 6px solid #f3f3f3;
  border-top: 6px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

</style>
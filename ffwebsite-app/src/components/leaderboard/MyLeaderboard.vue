<script setup lang="ts">

import {nextTick, ref, shallowRef, watch} from 'vue'
import MyTable from './MyTable.vue';
import MyBracket from './MyBracket.vue';
import MyDraft from './MyDraft.vue';

import { onMounted } from 'vue'
import ffWebsiteAPI from "@/services/ff-website-api";
// import ffWebsiteAPI from '../../services/ff-website-api'

onMounted(() => {
  ffWebsiteAPI.ready = new Promise(resolve => {
      ffWebsiteAPI.resolver = resolve;
  });
  fetchSettings();
  ffWebsiteAPI.resolver(1)
  console.log("Leaderboard is mounted")
});

const tables = [
  { name: 'MyTable', comp: MyTable },
  { name: 'MyDraft', comp: MyDraft },
  { name: 'MyBracket', comp: MyBracket },
]

interface selectdataInfo {
    select: string,
}

interface settingsInfo {
    season: string,
    playoff_week_start: number,
}

const loading = ref(false);

const per = ref(false)
const ppg = ref(false)

const currentYear = ref("Year:");
const currentStat = ref("Regular Season");
const playoffWeek = ref(0);
const maxHighWeek = ref(17);
const currentLowWeek = ref(1);
const currentHighWeek = ref(14);

let currentTable = shallowRef(tables[0]);

let avg = shallowRef('Total Points');
let perc = shallowRef('Record');

let yearoptions = ref<Array<selectdataInfo | null>>([{select: "All Time"}])
let weekoptions = ref<Array<selectdataInfo | null>>([])

let seasonsettings = new Map<string, settingsInfo>()

let statsoptions: Array<selectdataInfo> = [
  {select: "Regular Season"},
  {select: "Postseason"},
  {select: "Combined"}
]

async function fetchSettings() {
    loading.value = true;
    try {
      //yearoptions.value.push({select: "2019"})
      const response = await ffWebsiteAPI.getSettings(currentYear.value);
      for (let i=0; i<response.length; i++) {
        seasonsettings.set(response[i].season, response[i])
      }
      seasonsettings.forEach((value: settingsInfo, key: string) => {
        yearoptions.value.push({select: key})
      });

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

async function getSeasonSettings(year: string) {
      weekoptions.value = [];
      playoffWeek.value = seasonsettings.get(year).playoff_week_start;

      for (let i=0; i<playoffWeek.value+2; i++) {
        weekoptions.value.push({select: (i + 1).toString()})
      }
      await nextTick()
}

function updateValues(payload: { stat?: string; lowerWeek?: number; higherWeek?: number; maxHighWeek?: number }) {
  if (payload.stat !== undefined) currentStat.value = payload.stat;
  if (payload.lowerWeek !== undefined) currentLowWeek.value = payload.lowerWeek;
  if (payload.higherWeek !== undefined) currentHighWeek.value = payload.higherWeek;
  if (payload.maxHighWeek !== undefined) maxHighWeek.value = payload.maxHighWeek;
}

watch(() => currentYear.value, (newYear) => {
  if (!(newYear == 'Year:' || newYear == 'All Time')) {
    getSeasonSettings(newYear);
  }
})

function goBack() {
  currentTable.value = tables[0];
}

function changePerc(event: Event) {
  const target = event.target as HTMLButtonElement;
  if (target != null) {
    target.disabled = true
    if (per.value == true) {
      per.value = false
      perc.value = "Record";
    }
    else {
      per.value = true
      perc.value = "Winning %";
    }
    target.disabled = false
  }
}

function changeAvg(event: Event) {
  const target = event.target as HTMLButtonElement;
  if (target != null) {
    target.disabled = true
    if (ppg.value == true) {
      ppg.value = false
      avg.value = "Total Points";
    }
    else {
      ppg.value = true
      avg.value = "Points Per Game";
    }
    target.disabled = false
  }
}

function showBrac() {
  currentTable.value = tables[2];
}

function showDraft() {
  currentTable.value = tables[1];
}

</script>

<template>
  <div class="controls-grid">
    <div class="left-col">
      <div class="top-selects">
        <select v-model="currentYear" name="year" id="year">
          <option disabled :selected="currentYear == 'Year:'">Year:</option>
          <option :disabled="(currentTable.comp == MyDraft || currentTable.comp == MyBracket) && (year.select =='All Time')" v-for="year in yearoptions" :value="year.select" :key="year.select">{{year.select}}</option>
        </select>
        <select v-if="currentTable.comp == MyTable" v-model="currentStat" name="stat" id="stat">
          <option v-for="stats in statsoptions" :value="stats.select" :key="stats.select">{{stats.select}}</option>
        </select>
        </div>
        <div class="week-range-group" v-if="currentTable.comp == MyTable && !(currentYear =='All Time' || currentYear =='Year:')">
          <select v-model="currentLowWeek" name="week" id="week">
            <option v-for="week in weekoptions" :disabled="Number(week.select) >= Number(currentHighWeek) || (Number(week.select) > maxHighWeek && Number(week.select) < 100)" :value="week.select" :key="week.select">Week {{week.select}}</option>
          </select>
          <span v-if="currentHighWeek!=100">-</span>
          <select v-model="currentHighWeek" :class="{ 'same-week': Number(currentHighWeek) === 100 }" name="week" id="week">
            <option v-for="week in weekoptions" :disabled="Number(week.select) < currentLowWeek || (Number(week.select) > maxHighWeek && Number(week.select) < 100)" :value="(week.select != currentLowWeek) ? week.select : 100" :key="week.select">Week {{week.select}}</option>
          </select>
        </div>
      <div class="avg-perc">
        <button v-if="currentTable.comp == MyTable" id="avg" name="avg" class="btn btn-secondary" @click="changeAvg($event)">{{avg}}</button>
        <button v-if="currentTable.comp == MyTable" id="perc" name="perc" class="btn btn-secondary" @click="changePerc($event)">{{perc}}</button>
      </div>
    </div>

    <div class="right-col">
      <button v-if="currentTable.comp == MyDraft" id="brac" name="back" class="btn btn-light" @click="goBack()">Back</button>
      <button v-if="currentYear != 'Year:' && currentYear != 'All Time' && currentTable.comp != MyDraft" id="draft" name="draft" class="btn btn-light" @click="showDraft()">Draft Recap</button>
      <button v-if="currentYear != 'Year:' && currentYear != 'All Time' && currentTable.comp != MyBracket" id="brac" name="brac" class="btn btn-light" @click="showBrac()">Playoff Bracket</button>
      <button v-if="currentTable.comp == MyBracket" id="brac" name="back" class="btn btn-light" @click="goBack()">Back</button>
    </div>

  </div>

  <div v-if="loading" class="loading-overlay">
    <div class="spinner"></div>
  </div>
  <component v-else :is="currentTable.comp" :year="currentYear" :lowerWeek="currentLowWeek" :higherWeek="currentHighWeek" :playoffWeek="playoffWeek" :maxHighWeek="maxHighWeek" :stat="currentStat" :ppg="ppg" :per="per" @update-values="updateValues"></component>

</template>

<style scoped>

th {
    cursor: pointer;
}

.controls-grid {
  display: grid;
  grid-template-columns: 30% 1fr 220px;
  gap: 15px;
  align-items: start;
  margin-bottom: 15px;
  width: 100%;
}

.left-col {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.top-selects {
  display: grid;
  grid-template-columns: 0.66fr 1fr;
  gap: 5px;
  align-items: center;
  font-size: 13px;
  min-width: 250px;
  max-width: 400px;
}

.top-selects select {
  width: 100%;
}

.week-range-group {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 5px;
  font-size: 13px;
  align-items: center;
  min-width: 250px;
  max-width: 400px;
}

.same-week {
  grid-column: 3;
  background: #013369;
  color: #013369;
  width: 100%;
}

.week-range-group select {
  width: 100%;
}

.avg-perc {
  display: grid;
  grid-template-columns: 1fr 0.75fr;
  gap: 5px;
  align-items: center;
  margin-top: 5px;
  min-width: 250px;
  max-width: 400px;
}

.avg-perc button {
  width: 100%;
  min-width: 0;
  font-size: 11px;
}


.top-selects select,
.week-range-group select,
.avg-perc button {
  height: 30px;
  line-height: 1.2;
  padding: 0 8px;
  box-sizing: border-box;
}

.right-col {
  grid-column: 3;
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 200px;
  flex-shrink: 0; /* never shrink */
}

.right-col button {
  height: 35px;
  font-size: 15px;
  float: none;
  white-space: nowrap;
}

#draft {
height:35px;
width:200px;
font-size: 15px;
}
#brac {
height:35px;
width:200px;
font-size: 15px;
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

@media (max-width: 600px) {

  .controls-grid {
    grid-template-columns: 25% 1fr auto;
  }

  .left-col {
    flex-wrap: wrap;
  }

  .top-selects {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    min-width: 181px;
    max-width: 236px;
  }

  .week-range-group {
    display: flex;
    flex-wrap: nowrap;
    gap: 5px;
    align-items: center;
    min-width: 181px;
    max-width: 236px;
  }

  .avg-perc {
    min-width: 180px;
    max-width: 235px;
  }

  .right-col {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .right-col button {
    width: 100%;
  }

  #year, #week, #stat, #avg, #perc {
    font-size: 10px !important;
  }

  #brac, #draft {
    width: 150px !important;
    height: 30px !important;
    font-size: 10px !important;
  }
}

</style>
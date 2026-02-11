<script setup lang="ts">
import { Ref,  nextTick, onMounted, ref } from 'vue'
import ffWebsiteAPI from '@/services/ff-website-api';

onMounted(() => {
  ffWebsiteAPI.ready = new Promise(resolve => {
      ffWebsiteAPI.resolver = resolve;
  });
  ffWebsiteAPI.resolver(1)
  fetchRecord();
});

async function fetchRecord() {
  try {
      const response = await ffWebsiteAPI.getRecord(records.value[0].record);
      tableData.value = response; 
      await nextTick()
    }
    catch (e) {
      console.log(e)
    }
}

interface rdata {
        record: string
        }

let records: Ref<Array<rdata>> = ref([
    {record: "Top 50 Highest Single Game Scores"},
    {record: "Top 15 Points For Single Regular Season"},
    {record: "Top 15 Points Per Game Single Regular Season"},
    {record: "Top 15 Points For Single Postseason"},
    {record: "Top 15 Points Per Game Single Postseason"},
])


const tableData : Ref<Array<rdataInfo>>= ref([]);

interface rdataInfo {
score: number,
pf: number,
full_name: string,
opp_full_name: string,
week: number,
season: number,
}


function switchTable(event: Event) {
  const target = event.target as HTMLButtonElement;
  if (target != null) {
    target.disabled = true
    let newRecord = records.value.shift();
    if (newRecord != undefined) {
      records.value.push(newRecord);
      fetchRecord();
    }
    target.disabled = false
  }
}

</script>


<template>
<h2 class="rhead">{{records[0].record}}</h2>
<div class="dir">
<!-- <button :disabled="tableref==0" id="prev" name="prev" class="btn btn-light" @click="switchTable(tableref, 'prev')">Previous</button> -->
<button id="next" name="next" class="btn btn-light" @click="switchTable($event)">Next</button>
</div>
<div id="recordtables">
  <table class="table table-light table-striped">
    <col style="width: 50px;"/>
    <thead class="thead">
      <tr>
        <th class="thead" scope="col">
        </th>
        <th class="thead" scope="col">
          Points
        </th>
        <th class="thead" scope="col">
          Team
        </th>
        <th v-if="records[0].record == 'Top 50 Highest Single Game Scores'" class="thead" scope="col">
          Opponent
        </th>
        <th class="thead" scope="col">
          Year{{ records[0].record == 'Top 50 Highest Single Game Scores' ? (', Week') :  ''}}
        </th>
    </tr>
    </thead>
    <tbody>
      <tr v-for="(row, index) in tableData" :key="row.score">
        <td>{{ index+1 }}.</td>
        <td>{{ row.pf }}</td>
        <td>{{ row.full_name  }}</td>
        <td v-if="records[0].record == 'Top 50 Highest Single Game Scores'">{{ row.opp_full_name  }}</td>
        <td>{{ (records[0].record == 'Top 50 Highest Single Game Scores') ? `${row.season}, Week ${row.week}` : `${row.season}`  }}</td>
      </tr>
    </tbody>
  </table>
  
  </div>
</template>

<style scoped>
  .rhead {
      margin-bottom: 25px;
  }

  #next {
      margin-left: 10px;
  }

  @media (max-width: 600px) {
    .rhead {
      font-size: 22px;
    }
    td {
      font-size: 12px
    }
    #next {
      font-size: 14px;
    }
    .thead {
      font-size: 14px;
    }
  }
</style>
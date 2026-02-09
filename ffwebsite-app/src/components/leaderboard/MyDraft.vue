<script setup lang="ts">
import { Ref,  nextTick, onMounted, ref, watch } from 'vue'
import ffWebsiteAPI from '@/services/ff-website-api';

const props = defineProps(['year'])
const draftdata: Ref<{draftpicks_set: Array<any>} | null> = ref(null);
const draftPicksByRound: Ref<any> = ref(null) 
const teams: Ref<any> = ref(null) 
const draftOrder: Ref<any> = ref(null) 


onMounted(() => {
  ffWebsiteAPI.ready = new Promise(resolve => {
      ffWebsiteAPI.resolver = resolve;
  });
  ffWebsiteAPI.resolver(1)
  fetchDraft();
});


async function fetchDraft() {
    try {
      const response = await ffWebsiteAPI.getDraft(props.year);
      draftdata.value = response[0]; 
      if (draftdata.value != null) {
        draftPicksByRound.value = sortPicksIntoRounds(draftdata.value.draftpicks_set)
        teams.value = Number(draftPicksByRound.value[0].length)
        draftOrder.value = draftdata.value.draftpicks_set.slice(0, teams.value)
        //draftOrder.value = draftPicksByRound.value[0].slice(0, teams.value)
      }
      await nextTick()
    }
    catch (e) {
      console.log(e)
    }
}


watch(() => props.year, () => {
  draftdata.value = {'draftpicks_set': []}
  draftPicksByRound.value = null
  draftOrder.value = null
  fetchDraft();
})


const sortPicksIntoRounds = (draftPicks: any[]): any[] => {
  const roundsMap = new Map<number, any[]>();

  // Group draft picks by round number
  draftPicks.forEach(pick => {
    const roundNum = pick.round_num;
    if (!roundsMap.has(roundNum)) {
      roundsMap.set(roundNum, []);
    }
    var round = roundsMap.get(roundNum)
    if (round != undefined) {
      round.push(pick);
    }
  });

  roundsMap.forEach((value: Array<any>, key: number) => {
    if (isEvenRound(key+1)) {
      const reverseRound = value.reverse();
      roundsMap.set(key, reverseRound)
    }
  });

  const roundsArray = Array.from(roundsMap.values());

  roundsArray.sort((a, b) => a[0].round_num - b[0].round_num);
  return roundsArray;
  }

const isEvenRound = (roundNum: number) => {
  return roundNum % 2 !== 0;
}


// const checkClass = (index: number, index2: number) => {
//   if (isEvenRound(index+1)) {
//     if (index2==11) {
//       return 'ldown'
//     }
//     else {
//       return 'ltor'
//     }
//   }
//   else {
//     if (index2==0) {
//       return 'fdown'
//     }
//     else {
//       return 'rtol'
//     }
//   }
// }


</script>

<template>
  <h2>{{year}} Draft</h2>
  
  <body>
        <div class="draft-wrapper">
        <div class="draft-board">
        <div class="team" v-for="pick in draftOrder" :key="pick.pick_num">
          {{ pick.team.first_name }}
          <br>
          {{ pick.team.last_name }}
        </div>
        <template v-for="(round, round_index) in draftPicksByRound" :key="round_index">
        <div class="pick" :class="{'pick-wr': pick.player.position==='WR', 
                                  'pick-rb': pick.player.position==='RB',
                                  'pick-te': pick.player.position==='TE',
                                  'pick-qb': pick.player.position==='QB',
                                  'pick-k': pick.player.position==='K',
                                  'pick-d': pick.player.position==='DEF'}" 
                                  v-for="(pick, pick_index) in round" :key="pick.pick_num">
          <span class="pick-number">{{pick.round_num}}.{{isEvenRound(Number(round_index)+1) ? Number(pick_index)+1 : teams-Number(pick_index)}} ({{pick.pick_num}})</span>{{pick.player.first_name}}<br>{{pick.player.last_name}}
          <span class="pos">{{pick.player.position}}</span>
          <!-- <span :class="checkClass(index, index2)"></span> -->
          <!-- ARROW Direction <span :class="isEvenRound(index+1) ? ((index2==11) ? 'down-arrow': 'side-arrow') : (index2==0 ? 'down-arrow' : 'side-arrow')">{{(isEvenRound(index+1)) ? (index2==11 ? "&#8595;" : "&#8594;") : (index2==0 ? "&#8595;" : "&#8592;")}}</span> -->
        </div>
        </template>
        </div>
        </div>
  </body>
  
  </template>


<style scoped>
h2 {
    margin-left: 5px;
  }
p {
    margin-left: 5px;
  }

.draft-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.draft-board {
    display: grid;
    grid-template-columns: repeat(v-bind('teams'), 100px); /* 12 items in one row */
    gap: 10px; /* Space between picks */
    padding: 10px;
    width: max-content;
    margin: auto;
    grid-row: 1;
}

.pick {
    background-color: white; /* White background for each pick */
    border-radius: 15px; /* Rounded corners */
    padding: 10px;
    height: 70px;
    padding-top: 17px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Slight shadow for depth */
    position: relative; /* Enable positioning */
    text-align: center;
    font-size: 12px;
    color: black;
}

.team {
    background-color: white; /* White background for each pick */
    border-radius: 15px; /* Rounded corners */
    padding: 8px;
    height: 50px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Slight shadow for depth */
    position: relative; /* Enable positioning */
    text-align: center;
    font-size: 12px;
    color: black;
}

.row {
  flex-direction: row;
}

.reverse-order {
  position: relative;
  flex-direction: row-reverse;
}

.pick-number {
    position: absolute;
    top: 5px;
    left: 6px;
    font-weight: bold;
    font-size: 8px;
    color: black;
}

.pos {
    position: absolute;
    top: 5px;
    right: 8px;
    font-weight: bold;
    font-size: 8px;
    color: black;
}

.pick-rb {
  background-color: #E97777;
}

.pick-wr {
  background-color: #A7C7E7;
}

.pick-qb {
  background-color: #FCDDB0;
}

.pick-te {
  background-color: #FFFAD7;
}

.pick-k {
  background-color: lightgrey;
}

.pick-d {
  background-color: #FF9F9F;
}


.ltor {
  position: absolute;
  border: 2px solid black;
  bottom: 5px;
  right: -60px;
  width: 71%;
}

.rtol {
  position: absolute;
  border: 2px solid black;
  top: 5px;
  right: 85px;
  width: 71%;
  z-index: 1;
}

.fdown {
  position: absolute;
  border: 2px solid black;
  transform:rotate(90deg);
  width: 71%;
  top: 97px;
  right: 55px;
}

.ldown {
  position: absolute;
  border: 2px solid black;
  transform:rotate(90deg);
  width: 71%;
  top: 100px;
  left: 55px;
}

.side-arrow {
    position: absolute;
    bottom: 1px;
    right: 6px;
    font-weight: bold;
    font-size: 12px;
}

.down-arrow {
    position: absolute;
    top: 2px;
    right: 9px;
    font-weight: bold;
    font-size: 12px;
}

</style>
let workTittle = document.getElementById('work');
let breakTittle = document.getElementById('break');

let workTime = 45;
let breakTime = 5;

let seconds = "00";
let timerInterval;


let workSound = new Audio('work_sound.mp3');
let breakSound = new Audio('break_sound.mp3');


window.onload = () => {
    document.getElementById('minutes').innerHTML = String(workTime).padStart(2, '0');
    document.getElementById('seconds').innerHTML = seconds;
    workTittle.classList.add('active');
}


function start() {

    document.getElementById('start').style.display = "none";
    document.getElementById('pause').style.display = "block";
    document.getElementById('reset').style.display = "block";


    let workMinutes = workTime - 1;
    let breakMinutes = breakTime - 1;
    seconds = 59;

    let breakCount = 0;


    let timerFunction = () => {

        document.getElementById('minutes').innerHTML = String(workMinutes).padStart(2, '0');
        document.getElementById('seconds').innerHTML = String(seconds).padStart(2, '0');
        console.log(`Timer: ${workMinutes}:${seconds}`);

        
        seconds--;

        if (seconds === -1) {
            workMinutes--;
            seconds = 59;

            if (workMinutes === -1) {
                if (breakCount % 2 === 0) {
                 
                    workMinutes = breakMinutes;
                    breakCount++;
                    breakSound.play();

               
                    workTittle.classList.remove('active');
                    breakTittle.classList.add('active');
                } else {
                    
                    workMinutes = workTime - 1;
                    breakCount++;
                    workSound.play();

                   
                    breakTittle.classList.remove('active');
                    workTittle.classList.add('active');
                }
            }
        }
    };

   
    timerInterval = setInterval(timerFunction, 1000); 
}


function pause() {
    clearInterval(timerInterval);
    document.getElementById('start').style.display = "block";
    document.getElementById('pause').style.display = "none";
}

function reset() {
    clearInterval(timerInterval);
    document.getElementById('minutes').innerHTML = String(workTime).padStart(2, '0');
    document.getElementById('seconds').innerHTML = seconds;

    document.getElementById('start').style.display = "block";
    document.getElementById('pause').style.display = "none";
    document.getElementById('reset').style.display = "none";

    workTittle.classList.add('active');
    breakTittle.classList.remove('active');
}

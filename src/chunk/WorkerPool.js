
// Inspired by: http://www.smartjava.org/content/html5-easily-parallelize-jobs-using-web-workers-and-threadpool/

class WorkerPool
{
		constructor(url, size)
		{
				this.url = url;
				this.size = size;
				this.workerQueue = [];
				this.taskQueue = [];
		}


		init()
		{
				for (var i=0; i<this.size; i++){
						this.workerQueue.push(new WorkerThread(this));
				}
		}


		addTask(workerTask)
		{
        if (this.workerQueue.length > 0) {
            // get the worker from the front of the queue
            var workerThread = this.workerQueue.shift();
            workerThread.run(workerTask);
        } else {
            // no free workers,
            this.taskQueue.push(workerTask);
        }
    }


		submit(workerThread)
		{
        if (this.taskQueue.length > 0) {
            var workerTask = this.taskQueue.shift();
            workerThread.run(workerTask);
        } else {
            this.workerQueue.push(workerThread);
        }
    }


		kill()
		{
				if (this.workerQueue.length > 0) {
						for (var i=0; i<this.workerQueue.length; i++){
								this.workerQueue[i].worker.terminate();
						}
				}
		}
}




class WorkerThread
{
	constructor(parentPool)
	{
		this.parentPool = parentPool;

		this.worker = new Worker(parentPool.url);
		this.worker.onmessage = function(e){
			this.workerTask.callback(e);
			this.parentPool.submit(this);
		}.bind(this);

		this.worker.onerror = function(event){
		    console.log(event.message + " (" + event.filename + ":" + event.lineno + ")");
		};

    this.workerTask = {};
	}

	run(workerTask)
	{
		this.workerTask = workerTask;
		this.worker.postMessage(workerTask.message);
	}
}



// // from: http://www.smartjava.org/content/html5-easily-parallelize-jobs-using-web-workers-and-threadpool/
//
// class WorkerPool
// {
// 		constructor(size)
// 		{
// 				this.size = size;
// 				this.workerQueue = [];
// 				this.taskQueue = [];
// 		}
//
// 		init()
// 		{
// 				for (var i=0; i<this.size; i++){
// 						this.workerQueue.push(new PoolWorker(this));
// 				}
// 		}
//
// 		addWorkerTask(workerTask) {
//         if (this.workerQueue.length > 0) {
//             // get the worker from the front of the queue
//             var workerThread = this.workerQueue.shift();
//             workerThread.run(workerTask);
//         } else {
//             // no free workers,
//             this.taskQueue.push(workerTask);
//         }
//     }
//
// 		freeWorkerThread(workerThread) {
//         if (this.taskQueue.length > 0) {
//             // don't put back in queue, but execute next task
//             var workerTask = this.taskQueue.shift();
//             workerThread.run(workerTask);
//         } else {
//             this.workerQueue.push(workerThread);//for one use: this.taskQueue.push(workerThread);
//         }
//     }
//
// 		terminatePool()
// 		{
// 				if (this.workerQueue.length > 0) {
// 						for (var i=0; i<this.workerQueue.length; i++){
// 								this.workerQueue[i].worker.terminate();
// 						}
// 				}
// 		}
// }
//
//
// // runner work tasks in the pool
// function PoolWorker(parentPool) {
//
//     var _this = this;
//
//     this.parentPool = parentPool;
//     this.workerTask = {};
//
//     this.run = function(workerTask) {
//         this.workerTask = workerTask;
//         // create a new web worker
//         if (this.workerTask.script!= null) {
//             var worker = new Worker(workerTask.script);
//             worker.addEventListener('message', dummyCallback, false);
//             worker.postMessage(workerTask.startMessage);
//         }
//     }
//
//     // for now assume we only get a single callback from a worker
//     // which also indicates the end of this worker.
//     function dummyCallback(event) {
//         // pass to original callback
//         _this.workerTask.callback(event);
//
//         // we should use a seperate thread to add the worker
//         _this.parentPool.freeWorkerThread(_this);
//     }
// }
//
//
// class WorkerTask
// {
// 		constructor(script, msg, callback){
// 		    this.script = script;
// 		    this.callback = callback;
// 		    this.startMessage = msg;
// 		}
// };

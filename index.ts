import express from 'express';


// IN memory data stores
let disputes : any[] = [];
let sqsQueue : any[] = [];
let activeJobs : any[] = [];


const app = express();
app.use(express.json());

//create a new dispute
app.post('/disputes',(req,res) => {
    const dispute = {
        id : `du_${Date.now()}`,
        status: 'pending',
        amount: req.body.amount,
        reason: req.body.reason,
        created: Date.now(),
        evidence: {},
    };

    disputes.push(dispute);

    //enqueue for processing in the simulated SQS 
    sqsQueue.push(dispute);
    res.status(201).json(dispute);
});


// get all disputes
app.get('/api/disputes', ( req ,res ) => {
    res.json(disputes);
});

// simulate the processing of disputes
setInterval(() => {
    if(sqsQueue.length > 0) {
        const dispute = sqsQueue.shift();

        activeJobs.push({
            jobId : `job_${Date.now()}`,
            disputeId: dispute.id,
            status: 'processing',
            started: Date.now(),
        });

        // Simulate processing time
        setTimeout(() => {
            dispute.status = 'resolved';
            // remove from active jobs
            activeJobs = activeJobs.filter(job => job.disputeId !== dispute.id);
            console.log(`Dispute ${dispute.id} processed and resolved.`);
        }, 3000);
    }
}, 1000); // check sds queue every second

// get all active jobs
app.get('/api/jobs', (req, res) => {
    res.json(activeJobs);
});

app.listen(3000, () => console.log('Disputes API server runnning on port 3000'));

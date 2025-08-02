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



app.listen(3000, () => console.log('Disputes API server runnning on port 3000'));

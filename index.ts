import express from 'express';

interface Dispute {
    id: string;
    status: string;
    amount: number;
    reason: string;
    created: number;
    evidence: object;
    retries?: number; // track retry attempts
}

interface Job {
    jobId: string;
    disputeId: string;
    status: 'processing' | 'failed';
    started: number;
    retries: number;
}

const app = express();
app.use(express.json());

// In-memory data stores
let disputes: Dispute[] = [];
let sqsQueue: Dispute[] = [];
let activeJobs: Job[] = [];
let deadLetterQueue: Dispute[] = [];

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 5000; // 5 seconds base delay before retry

// Create a new dispute
app.post('/disputes', (req, res) => {
    const dispute: Dispute = {
        id: `du_${Date.now()}`,
        status: 'pending',
        amount: req.body.amount,
        reason: req.body.reason,
        created: Date.now(),
        evidence: {},
        retries: 0,
    };

    disputes.push(dispute);
    sqsQueue.push(dispute);
    res.status(201).json(dispute);
});

// Get all disputes
app.get('/api/disputes', (req, res) => {
    res.json(disputes);
});

// Get all active jobs
app.get('/api/jobs', (req, res) => {
    res.json(activeJobs);
});

// Get Dead Letter Queue disputes
app.get('/api/dlq', (req, res) => {
    res.json(deadLetterQueue);
});

function randomFailure(): boolean {
    // Simulate 30% failure rate for job processing
    return Math.random() < 0.3;
}

// Process disputes from the queue with retry and jitter
function processNextDispute() {
    if (sqsQueue.length === 0) return;

    const dispute = sqsQueue.shift()!;
    const jobId = `job_${Date.now()}`;

    activeJobs.push({
        jobId,
        disputeId: dispute.id,
        status: 'processing',
        started: Date.now(),
        retries: dispute.retries || 0,
    });

    console.log(`Started processing dispute ${dispute.id}, attempt #${dispute.retries}`);

    setTimeout(() => {
        const jobIndex = activeJobs.findIndex(job => job.jobId === jobId);
        if (randomFailure()) {
            // Failure happened
            console.log(`Processing dispute ${dispute.id} failed.`);

            // Remove job from active jobs with failed status
            if (jobIndex >= 0) activeJobs.splice(jobIndex, 1);

            dispute.retries = (dispute.retries || 0) + 1;

            if (dispute.retries > MAX_RETRIES) {
                dispute.status = 'failed';
                deadLetterQueue.push(dispute);
                console.log(`Dispute ${dispute.id} moved to Dead Letter Queue after max retries.`);
            } else {
                // Calculate jitter: random delay between 0 and 2 seconds
                const jitter = Math.random() * 2000;
                // Schedule re-enqueue with base delay + jitter
                setTimeout(() => {
                    sqsQueue.push(dispute);
                    console.log(`Re-enqueued dispute ${dispute.id} with jittered retry delay.`);
                }, BASE_RETRY_DELAY_MS + jitter);
            }
        } else {
            // Success:
            dispute.status = 'resolved';
            console.log(`Dispute ${dispute.id} processed successfully.`);

            // Remove from active jobs
            if (jobIndex >= 0) activeJobs.splice(jobIndex, 1);
        }
    }, 3000); // simulate 3 seconds processing time
}

// Process disputes every second if any queued
setInterval(processNextDispute, 1000);

app.listen(3000, () => console.log('Disputes API server running on port 3000'));

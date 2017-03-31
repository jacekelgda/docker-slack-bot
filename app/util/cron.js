import cron from 'node-cron'

const startJob = (job) => {
  cron.schedule('* * * * *', () => {
    job()
  })
}

export { startJob }

const express = require("express")
const path = require("path")
const cors = require("cors")
const helmet = require("helmet")

const app = express()

app.use(cors())

/*app.use(helmet({
	contentSecurityPolicy: false
}))*/

app.disable("x-powered-by")

app.use((req, res, next) => {
	if(!["HEAD", "GET", "OPTIONS"].includes(req.method)){
		return res.status(404).end()
	}

	return next()
})

app.use(express.static(path.join(__dirname, "drive")))

app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"))
})

app.listen(6662)
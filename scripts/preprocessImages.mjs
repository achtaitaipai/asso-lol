import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const INPUTDIR = 'rawImages'
const OUTPUTDIR = 'static/portfolio'

async function main() {
	clearDir(OUTPUTDIR)
	const fileNames = getAllImagesPathes(INPUTDIR)
	const miniaturesData = await transformImages(
		fileNames,
		{
			width: 600,
			height: 376,
			fit: 'inside'
		},
		['jpg', 'webp']
	)
	const largesData = await transformImages(
		fileNames,
		{ width: 1200, height: 1200, fit: 'inside' },
		['jpg']
	)
	const miniaturesPathes = miniaturesData.map(({ hash }) => path.join(OUTPUTDIR, `${hash}.jpg`))
	const placeHoldersHash = await createPlaceHolders(miniaturesPathes, OUTPUTDIR, '#FCCC03')

	createJson(path.join('src/lib', '_imagesData.json'), {
		mini: miniaturesData,
		larges: largesData,
		placeHolders: placeHoldersHash
	})
}

/**
 *
 * @param {string[]} fileNames
 * @param {sharp.ResizeOptions} options
 * @param {(keyof sharp.FormatEnum)[]} formats
 *
 */
async function transformImages(fileNames, options, formats) {
	let imagesData = []
	for await (const file of fileNames) {
		const inputPath = path.join(INPUTDIR, file)
		const datas = await transformImage(inputPath, OUTPUTDIR, options, formats)
		imagesData.push(datas)
	}
	return imagesData
}

let transformedIndex = 0
/**
 * @param {string} filePath
 * @param {string} outDir
 * @param {sharp.ResizeOptions} options
 * @param {(keyof sharp.FormatEnum)[]} formats
 */
async function transformImage(filePath, outDir, options, formats) {
	const hash = transformedIndex
	transformedIndex++
	/**@type {{hash:string,width:number,height:number}} */
	let data = undefined
	for await (const format of formats) {
		const fileName = `${hash}.${format}`
		const { width, height } = await sharp(filePath)
			.resize(options)
			.toFormat(format)
			.toFile(path.join(outDir, fileName))
		if (!data) data = { hash, width, height }
	}
	return data
}
/**
 * @param {string[]} filePathes
 * @param {string} outDir
 * @param {string} color
 * @returns
 */
async function createPlaceHolders(filePathes, outDir) {
	let index = 0
	const hashes = []
	for await (const filePath of filePathes) {
		index++
		const hash = `${index}-placeholder`
		const fileName = `${hash}.${'png'}`
		await sharp(filePath)
			.resize(350)
			.png({ palette: true, colors: 4 })
			.tint([126, 101, 3])
			.toFile(path.join(outDir, fileName))
		hashes.push({ hash })
	}
	return hashes
}

/**
 *
 * @param {string} output
 * @param {Object} datas
 */
function createJson(output, datas) {
	fs.writeFileSync(output, JSON.stringify(datas), 'utf8')
}

/**
 * @param {string} dir
 */
async function clearDir(dir) {
	const pathes = getAllImagesPathes(dir)
	pathes.forEach(async (p) => {
		fs.unlinkSync(path.join(dir, p))
	})
}

/**
 * @param {string} dir
 */
function getAllImagesPathes(dir) {
	const pathes = fs
		.readdirSync(dir)
		.filter((p) => /\.(gif|jpe?g|tiff?|png|webp|bmp|svg|heic)$/i.test(p))
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
	return pathes
}

main()

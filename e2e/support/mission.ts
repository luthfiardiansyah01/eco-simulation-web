import { expect, type Page } from '@playwright/test'

export const LEVEL_ONE_PATH = '/play/west-java/1?difficulty=normal'

export async function openLevelOne(page: Page) {
  await page.goto(LEVEL_ONE_PATH)
  await expect(page.getByTestId('action-clean_waste')).toBeVisible()
}

export async function cleanWaste(page: Page, times: number, startPollution: number) {
  const button = page.getByTestId('action-clean_waste')
  const pollution = page.getByTestId('env-pollution')

  for (let i = 1; i <= times; i += 1) {
    await expect(button).toBeEnabled()
    await button.click()
    await expect(pollution).toHaveText(`${startPollution - 5 * i}%`)
  }
}

export async function buildFilter(page: Page, times: number, startFish: number) {
  const button = page.getByTestId('action-build_filter')
  const fish = page.getByTestId('env-fishPopulation')

  for (let i = 1; i <= times; i += 1) {
    await expect(button).toBeEnabled()
    await button.click()
    await expect(fish).toHaveText(`${startFish + 5 * i}%`)
  }
}

export async function plantTree(
  page: Page,
  times: number,
  startTrees: number,
  target = 50
) {
  const button = page.getByTestId('action-plant_tree')
  const trees = page.getByTestId('resource-trees')

  for (let i = 1; i <= times; i += 1) {
    await expect(button).toBeEnabled()
    await button.click()
    await expect(trees).toHaveText(`${startTrees + i}/${target}`)
  }
}

export async function completeLevelOne(page: Page) {
  // Normal difficulty starts at pollution 78, fish 18, and 23 trees.
  await cleanWaste(page, 12, 78)
  await buildFilter(page, 2, 54)
  await plantTree(page, 27, 23)
}

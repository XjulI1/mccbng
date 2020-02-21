import { createLocalVue, shallowMount } from '@vue/test-utils'

import Router from 'vue-router'

import Home from '@/views/Home'

const localVue = createLocalVue()

localVue.use(Router)

describe('Home.vue', () => {
  test('should match snapshot', () => {
    const wrapper = shallowMount(Home, {
      localVue
    })

    expect(wrapper.element).toBeDefined()
    expect(wrapper.element).toMatchSnapshot()
  })
})

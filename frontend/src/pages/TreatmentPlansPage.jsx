import { useState } from 'react'
import { Loader2, MinusCircle } from 'lucide-react'
import { api } from '../api/client'
import { SelectInput, SubmitButton, TextInput } from '../components/Forms'
import { SectionHeader } from '../components/SectionHeader'

const initialForm = {
  customer_name: '',
  customer_phone: '',
  package_id: '',
  sessions_total: 6,
  expires_at: '',
}

export function TreatmentPlansPage({ data, refresh, setError, setSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [consumingIds, setConsumingIds] = useState(() => new Set())

  const submit = async (event) => {
    event.preventDefault()
    try {
      await api.createTreatmentPlan({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        package_id: Number(form.package_id),
        sessions_total: Number(form.sessions_total),
        sessions_used: 0,
        expires_at: new Date(form.expires_at).toISOString(),
        status: 'active',
      })
      setForm(initialForm)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleConsume = async (plan) => {
    if (consumingIds.has(plan.id)) return
    setConsumingIds((prev) => new Set(prev).add(plan.id))
    try {
      const result = await api.consumeTreatmentSession(plan.id)
      await refresh()
      const latestPlan = result.plan
      const remaining = latestPlan.sessions_remaining
      const pkgName = latestPlan.package?.name || '疗程卡'
      let msg = `扣次成功！${latestPlan.customer_name} 的「${pkgName}」剩余 ${remaining} 次`
      if (remaining <= 0) {
        msg = `扣次成功！${latestPlan.customer_name} 的「${pkgName}」已全部完成`
      }
      if (result.completed_appointment) {
        const apt = result.completed_appointment
        const aptTime = apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleString('zh-CN') : ''
        msg += `，关联预约「${apt.service_item_name || '护理项目'}${aptTime ? ' ' + aptTime : ''}」已自动完成`
      }
      setSuccess(msg)
    } catch (err) {
      setError(err.message)
    } finally {
      setConsumingIds((prev) => {
        const next = new Set(prev)
        next.delete(plan.id)
        return next
      })
    }
  }

  return (
    <div className="page-stack">
      <SectionHeader title="疗程次数管理" description="给客户开通疗程卡，跟踪总次数、已用次数和到期时间。" />
      <form className="form-grid panel" onSubmit={submit}>
        <TextInput label="客户姓名" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
        <TextInput label="手机号" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
        <SelectInput label="套餐" value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })} required>
          <option value="">选择套餐</option>
          {data.packages.map((pkg) => (
            <option value={pkg.id} key={pkg.id}>{pkg.name}</option>
          ))}
        </SelectInput>
        <TextInput label="总次数" type="number" min="1" value={form.sessions_total} onChange={(e) => setForm({ ...form, sessions_total: e.target.value })} />
        <TextInput label="到期日" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} required />
        <SubmitButton>开通疗程</SubmitButton>
      </form>

      <div className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>客户</th>
              <th>套餐</th>
              <th>次数</th>
              <th>到期</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.treatmentPlans.map((plan) => {
              const isConsuming = consumingIds.has(plan.id)
              const isDisabled = plan.sessions_remaining <= 0 || isConsuming
              return (
                <tr key={plan.id}>
                  <td>{plan.customer_name}<small>{plan.customer_phone}</small></td>
                  <td>{plan.package?.name}</td>
                  <td>{plan.sessions_used}/{plan.sessions_total}</td>
                  <td>{new Date(plan.expires_at).toLocaleDateString('zh-CN')}</td>
                  <td><span className="badge">{plan.status}</span></td>
                  <td>
                    <button
                      className="secondary-button"
                      onClick={() => handleConsume(plan)}
                      disabled={isDisabled}
                    >
                      {isConsuming ? <Loader2 size={15} className="spin" /> : <MinusCircle size={15} />}
                      <span>{isConsuming ? '扣次中' : '扣次'}</span>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

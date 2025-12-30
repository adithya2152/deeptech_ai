import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { contractService, CreateContractInput } from '@/services/contractService'
import { Expert } from '@/types'
import { Loader2, DollarSign, Clock, Calendar, Shield, FileText } from 'lucide-react'

interface ContractCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  expert: Expert
  onSuccess?: () => void
}

interface FormData {
  engagementType: 'hourly' | 'fixed'
  hourlyRate: number
  weeklyHourCap: number
  startDate: string
  endDate: string
  ipOwnership: 'client' | 'shared' | 'expert'
  ndaSigned: boolean
  escrowAmount: number
}

export function ContractCreationDialog({
  open,
  onOpenChange,
  projectId,
  expert,
  onSuccess,
}: ContractCreationDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { token } = useAuth()
  const [engagementType, setEngagementType] = useState<'hourly' | 'fixed'>('hourly')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      engagementType: 'hourly',
      weeklyHourCap: 40,
      ipOwnership: 'client',
      ndaSigned: false,
    },
  })

  const createContractMutation = useMutation({
    mutationFn: (data: CreateContractInput) => contractService.createContract(data, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast({
        title: 'Contract Created',
        description: `Contract invitation sent to ${expert.name}. They will be notified to review and accept.`,
      })
      reset()
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create contract',
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: FormData) => {
    const input: CreateContractInput = {
      projectId,
      expertId: expert.id,
      engagementType: data.engagementType,
      hourlyRate: Number(data.hourlyRate),
      weeklyHourCap: Number(data.weeklyHourCap),
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      ipOwnership: data.ipOwnership,
      ndaSigned: data.ndaSigned,
      escrowAmount: data.escrowAmount ? Number(data.escrowAmount) : undefined,
    }

    createContractMutation.mutate(input)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Contract with {expert.name}</DialogTitle>
          <DialogDescription>
            Set up the terms for your collaboration. The expert will review and accept the
            contract before work begins.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Engagement Type */}
          <div className="space-y-2">
            <Label htmlFor="engagementType">
              <Clock className="inline h-4 w-4 mr-2" />
              Engagement Type
            </Label>
            <Select
              value={engagementType}
              onValueChange={(value: 'hourly' | 'fixed') => {
                setEngagementType(value)
                setValue('engagementType', value)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly Rate (Recommended)</SelectItem>
                <SelectItem value="fixed">Fixed Price Project</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Hourly contracts provide flexibility and transparent time tracking
            </p>
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">
              <DollarSign className="inline h-4 w-4 mr-2" />
              Hourly Rate (USD)
            </Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              placeholder="150.00"
              {...register('hourlyRate', {
                required: 'Hourly rate is required',
                min: { value: 1, message: 'Rate must be at least $1' },
              })}
            />
            {errors.hourlyRate && (
              <p className="text-sm text-destructive">{errors.hourlyRate.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Market rate range for similar experts in this domain
            </p>
          </div>

          {/* Weekly Hour Cap */}
          {engagementType === 'hourly' && (
            <div className="space-y-2">
              <Label htmlFor="weeklyHourCap">
                <Clock className="inline h-4 w-4 mr-2" />
                Weekly Hour Cap
              </Label>
              <Input
                id="weeklyHourCap"
                type="number"
                placeholder="40"
                {...register('weeklyHourCap', {
                  required: 'Weekly hour cap is required',
                  min: { value: 1, message: 'Must be at least 1 hour' },
                  max: { value: 168, message: 'Cannot exceed 168 hours per week' },
                })}
              />
              {errors.weeklyHourCap && (
                <p className="text-sm text-destructive">{errors.weeklyHourCap.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Maximum hours the expert can log per week
              </p>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">
                <Calendar className="inline h-4 w-4 mr-2" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate', {
                  required: 'Start date is required',
                })}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">
                <Calendar className="inline h-4 w-4 mr-2" />
                End Date (Optional)
              </Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              <p className="text-sm text-muted-foreground">Leave blank for ongoing</p>
            </div>
          </div>

          {/* IP Ownership */}
          <div className="space-y-2">
            <Label htmlFor="ipOwnership">
              <Shield className="inline h-4 w-4 mr-2" />
              Intellectual Property Ownership
            </Label>
            <Select
              defaultValue="client"
              onValueChange={(value: 'client' | 'shared' | 'expert') =>
                setValue('ipOwnership', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client Owns All IP</SelectItem>
                <SelectItem value="shared">Shared IP Rights</SelectItem>
                <SelectItem value="expert">Expert Retains IP</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Defines who owns the intellectual property created during this engagement
            </p>
          </div>

          {/* NDA */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="ndaSigned"
              {...register('ndaSigned')}
              onCheckedChange={(checked) => setValue('ndaSigned', checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="ndaSigned" className="cursor-pointer">
                <FileText className="inline h-4 w-4 mr-2" />
                Non-Disclosure Agreement (NDA)
              </Label>
              <p className="text-sm text-muted-foreground">
                Expert agrees to keep all project information confidential
              </p>
            </div>
          </div>

          {/* Escrow Amount (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="escrowAmount">
              <DollarSign className="inline h-4 w-4 mr-2" />
              Initial Escrow Amount (Optional)
            </Label>
            <Input
              id="escrowAmount"
              type="number"
              step="0.01"
              placeholder="5000.00"
              {...register('escrowAmount', {
                min: { value: 0, message: 'Amount must be positive' },
              })}
            />
            {errors.escrowAmount && (
              <p className="text-sm text-destructive">{errors.escrowAmount.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Funds held in escrow to pay for approved hours. Can be added later.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createContractMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createContractMutation.isPending}>
              {createContractMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Contract Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
